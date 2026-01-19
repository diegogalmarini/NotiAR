import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { normalizeID, toTitleCase } from '@/lib/utils/normalization';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PDFParse } from "pdf-parse";
import * as mammoth from "mammoth";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function extractTextFromFile(file: File): Promise<string> {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.pdf')) {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        await parser.destroy(); // Cleanup pdfjs-dist resources
        return result.text;
    } else if (fileName.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    } else if (fileName.endsWith('.doc')) {
        throw new Error("El formato .doc no es compatible. Use .docx o .pdf.");
    } else {
        throw new Error("Formato de archivo no compatible. Use PDF o DOCX.");
    }
}

async function askGeminiForData(text: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
    Eres un experto en lectura de documentos notariales argentinos.
    Extrae la siguiente información del texto en JSON puro, sin markdown:
    - Persona principal: { "tax_id": "...", "nombre_completo": "...", "nacionalidad": "...", "fecha_nacimiento": "..." }
    - Inmueble: { "partido_id": "...", "nro_partida": "...", "nomenclatura_catastral": { ... } }
    - Operación: { "tipo_acto": "...", "rol": "..." }
    Si no encuentras un dato, usa null.
    TEXTO:
    ${text.substring(0, 15000)}
    `;

    const result = await model.generateContent(prompt);
    const cleanJson = result.response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
}

// 0. Preflight / Debug handlers
export async function GET() {
    return NextResponse.json({
        status: "alive",
        message: "Send a POST request with a 'file' field."
    });
}

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

export async function POST(request: Request) {
    console.log(`[INGEST] POST Request received`);
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
        }

        // 1. Extract Text
        let extractedText = await extractTextFromFile(file);

        // 2. AI Extraction
        let aiData;
        try {
            aiData = await askGeminiForData(extractedText);
        } catch (err) {
            console.error("AI error:", err);
            aiData = { persona: null, inmueble: null, operacion: { tipo_acto: 'COMPRAVENTA', rol: 'VENDEDOR' } };
        }

        const { persona, inmueble, operacion } = aiData;

        // 3. Ingest Persona
        let personData = null;
        if (persona?.tax_id && persona?.nombre_completo) {
            const { data } = await supabase
                .from('personas')
                .upsert({
                    tax_id: normalizeID(persona.tax_id),
                    nombre_completo: toTitleCase(persona.nombre_completo),
                    nacionalidad: persona.nacionalidad ? toTitleCase(persona.nacionalidad) : null,
                    fecha_nacimiento: persona.fecha_nacimiento,
                    origen_dato: 'IA_OCR',
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'tax_id' })
                .select().single();
            personData = data;
        }

        // 4. Ingest Inmueble
        let propertyData = null;
        if (inmueble?.partido_id && inmueble?.nro_partida) {
            const { data } = await supabase
                .from('inmuebles')
                .upsert({
                    partido_id: inmueble.partido_id,
                    nro_partida: inmueble.nro_partida,
                    nomenclatura_catastral: inmueble.nomenclatura_catastral || {},
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'partido_id,nro_partida' })
                .select().single();
            propertyData = data;
        }

        // 5. Create Folder and Link
        const { data: carpeta, error: cError } = await supabase
            .from('carpetas')
            .insert([{ caratula: `Ingesta: ${file.name}`, estado: 'ABIERTA' }])
            .select().single();
        if (cError) throw cError;

        const { data: escritura } = await supabase
            .from('escrituras')
            .insert([{ carpeta_id: carpeta.id, inmueble_princ_id: propertyData?.id || null }])
            .select().single();

        const { data: operacionRow } = await supabase
            .from('operaciones')
            .insert([{ escritura_id: escritura.id, tipo_acto: operacion?.tipo_acto || 'COMPRAVENTA' }])
            .select().single();

        if (personData) {
            await supabase
                .from('participantes_operacion')
                .insert([{
                    operacion_id: operacionRow.id,
                    persona_id: personData.tax_id,
                    rol: operacion?.rol || 'VENDEDOR'
                }]);
        }

        return NextResponse.json({
            message: 'Magic ingestion complete',
            folderId: carpeta.id,
            extracted: { persona, inmueble }
        });

    } catch (error: any) {
        console.error('Ingest API error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
