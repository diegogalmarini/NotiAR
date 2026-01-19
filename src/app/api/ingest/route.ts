import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { normalizeID, toTitleCase } from '@/lib/utils/normalization';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Dynamic imports for Node.js modules to prevent evaluation errors in some environments
async function getPdfParser() {
    // pdf-parse uses a legacy export structure that confuses TS with dynamic imports
    const pdf = await import("pdf-parse") as any;
    return pdf.default || pdf;
}

async function getMammoth() {
    return await import("mammoth");
}

async function extractTextFromFile(file: File): Promise<string> {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.pdf')) {
        try {
            const pdfParser = await getPdfParser();
            const data = await pdfParser(buffer);
            return data.text;
        } catch (err: any) {
            console.error("Error parsing PDF:", err);
            throw new Error(`Error al leer el PDF: ${err.message}`);
        }
    } else if (fileName.endsWith('.docx')) {
        const mammoth = await getMammoth();
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
    console.log(`[INGEST] POST Request received at ${new Date().toISOString()}`);

    // Explicitly handle content type check
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
        return NextResponse.json({ error: "Content-Type must be multipart/form-data" }, { status: 415 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
        }

        console.log(`[INGEST] Processing file: ${file.name} (${file.size} bytes)`);

        // 1. Extract Text
        let extractedText = await extractTextFromFile(file);

        if (!extractedText || extractedText.trim().length === 0) {
            throw new Error("No se pudo extraer texto del archivo.");
        }

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
            const { data, error: pError } = await supabase
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

            if (pError) {
                console.error("Persona upsert error:", pError);
            } else {
                personData = data;
            }
        }

        // 4. Ingest Inmueble
        let propertyData = null;
        if (inmueble?.partido_id && inmueble?.nro_partida) {
            const { data, error: iError } = await supabase
                .from('inmuebles')
                .upsert({
                    partido_id: inmueble.partido_id,
                    nro_partida: inmueble.nro_partida,
                    nomenclatura_catastral: inmueble.nomenclatura_catastral || {},
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'partido_id,nro_partida' })
                .select().single();

            if (iError) {
                console.error("Inmueble upsert error:", iError);
            } else {
                propertyData = data;
            }
        }

        // 5. Create Folder and Link
        const { data: carpeta, error: cError } = await supabase
            .from('carpetas')
            .insert([{ caratula: `Ingesta: ${file.name}`, estado: 'ABIERTA' }])
            .select().single();

        if (cError) {
            console.error("Carpeta creation error:", cError);
            throw cError;
        }

        // Create Escritura
        const { data: escritura, error: eError } = await supabase
            .from('escrituras')
            .insert([{
                carpeta_id: carpeta.id,
                inmueble_princ_id: propertyData?.id || null
            }])
            .select().single();

        if (eError) {
            console.error("Escritura creation error:", eError);
        }

        // Create Operacion
        if (escritura) {
            const { data: operacionRow, error: oError } = await supabase
                .from('operaciones')
                .insert([{
                    escritura_id: escritura.id,
                    tipo_acto: operacion?.tipo_acto || 'COMPRAVENTA'
                }])
                .select().single();

            if (oError) {
                console.error("Operacion creation error:", oError);
            } else if (personData && operacionRow) {
                await supabase
                    .from('participantes_operacion')
                    .insert([{
                        operacion_id: operacionRow.id,
                        persona_id: personData.tax_id,
                        rol: operacion?.rol || 'VENDEDOR'
                    }]);
            }
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
