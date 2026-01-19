import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { normalizeID, toTitleCase } from '@/lib/utils/normalization';
import { GoogleGenerativeAI } from "@google/generative-ai";
import pdf from "pdf-parse";
import mammoth from "mammoth";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function extractTextFromFile(file: File): Promise<string> {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.pdf')) {
        const data = await pdf(buffer);
        return data.text;
    } else if (fileName.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    } else if (fileName.endsWith('.doc')) {
        throw new Error("El formato .doc (antiguo) no es compatible. Por favor, guarde el archivo como .docx o .pdf e intente nuevamente.");
    } else {
        throw new Error("Formato de archivo no compatible. Use PDF o DOCX.");
    }
}

async function askGeminiForData(text: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    Eres un experto en lectura de documentos notariales argentinos (escrituras, minutas, etc).
    Extrae la siguiente información del texto proporcionado en formato JSON puro, sin markdown:
    
    - Persona principal (comprador/vendedor): { "tax_id": "CUIT/CUIL", "nombre_completo": "Nombre", "nacionalidad": "...", "fecha_nacimiento": "YYYY-MM-DD" }
    - Inmueble: { "partido_id": "Número de partido (ej: 079)", "nro_partida": "Número de partida", "nomenclatura_catastral": { "circ": "...", "secc": "...", "manzana": "...", "parcela": "..." } }
    - Operación: { "tipo_acto": "COMPRAVENTA / DONACION / etc", "rol": "VENDEDOR / COMPRADOR / CEDENTE" }

    Si no encuentras un dato, deja el valor como null.
    TEXTO DEL DOCUMENTO:
    ${text.substring(0, 10000)} // Limit text to avoid token limits in flash
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    // Clean up potential markdown formatting if Gemini includes it
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
        }

        // 1. Extract Text
        let extractedText = "";
        try {
            extractedText = await extractTextFromFile(file);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }

        // 2. AI Extraction
        let aiData;
        try {
            aiData = await askGeminiForData(extractedText);
        } catch (err: any) {
            console.error("AI Extraction error:", err);
            // Fallback to basic data if AI fails, using filename
            aiData = {
                persona: null,
                inmueble: null,
                operacion: { tipo_acto: 'COMPRAVENTA', rol: 'VENDEDOR' }
            };
        }

        const { persona, inmueble, operacion } = aiData;

        // 3. Ingest Persona
        let personData = null;
        if (persona?.tax_id && persona?.nombre_completo) {
            const normalizedPerson = {
                tax_id: normalizeID(persona.tax_id),
                nombre_completo: toTitleCase(persona.nombre_completo),
                nacionalidad: persona.nacionalidad ? toTitleCase(persona.nacionalidad) : null,
                fecha_nacimiento: persona.fecha_nacimiento,
                origen_dato: 'IA_OCR',
                updated_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('personas')
                .upsert(normalizedPerson, { onConflict: 'tax_id' })
                .select()
                .single();

            if (!error) personData = data;
        }

        // 4. Ingest Inmueble
        let propertyData = null;
        if (inmueble?.partido_id && inmueble?.nro_partida) {
            const normalizedProperty = {
                partido_id: inmueble.partido_id,
                nro_partida: inmueble.nro_partida,
                nomenclatura_catastral: inmueble.nomenclatura_catastral || {},
                updated_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('inmuebles')
                .upsert(normalizedProperty, { onConflict: 'partido_id,nro_partida' })
                .select()
                .single();

            if (!error) propertyData = data;
        }

        // 5. Create Folder and Link
        // Create Folder
        const { data: carpeta, error: carpetaError } = await supabase
            .from('carpetas')
            .insert([{ caratula: `Ingesta: ${file.name}`, estado: 'ABIERTA' }])
            .select()
            .single();

        if (carpetaError) throw carpetaError;
        const folderId = carpeta.id;

        // Create Deed
        const { data: escritura, error: escrituraError } = await supabase
            .from('escrituras')
            .insert([{
                carpeta_id: folderId,
                inmueble_princ_id: propertyData?.id || null
            }])
            .select()
            .single();
        if (escrituraError) throw escrituraError;

        // Create Operation
        const { data: opRow, error: opError } = await supabase
            .from('operaciones')
            .insert([{
                escritura_id: escritura.id,
                tipo_acto: operacion?.tipo_acto || 'COMPRAVENTA'
            }])
            .select()
            .single();
        if (opError) throw opError;

        // Link Person
        if (personData) {
            await supabase
                .from('participantes_operacion')
                .insert([{
                    operacion_id: opRow.id,
                    persona_id: personData.tax_id,
                    rol: operacion?.rol || 'VENDEDOR'
                }]);
        }

        return NextResponse.json({
            message: 'Magic ingestion complete',
            folderId,
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
