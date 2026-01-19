import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { normalizeID, toTitleCase } from '@/lib/utils/normalization';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getLatestModel } from '@/lib/aiConfig';
import * as Sentry from "@sentry/nextjs";

// genAI will be initialized per-request to ensure fresh env vars and avoid boundary issues

// Dynamic imports for Node.js modules to prevent evaluation errors in some environments
async function getPdfParser() {
    const pdf = await import("pdf-parse") as any;
    return pdf.default || pdf;
}

async function getMammoth() {
    return await import("mammoth");
}

async function extractTextFromFile(file: File): Promise<string> {
    const fileName = file.name.toLowerCase();
    console.log(`[EXTRACT] Starting extraction for ${fileName}...`);

    if (fileName.endsWith('.doc')) {
        throw new Error("El formato .doc (Word 97-2003) no es seguro. Por favor, abra el archivo y guárdelo como PDF o .docx antes de subirlo.");
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (fileName.endsWith('.pdf')) {
        try {
            const pdfParser = await getPdfParser();
            const data = await pdfParser(buffer);
            console.log(`[EXTRACT] PDF parsed: ${data.text?.length || 0} chars.`);
            return data.text || "";
        } catch (err: any) {
            console.error("[EXTRACT] Error parsing PDF:", err);
            return "";
        }
    } else if (fileName.endsWith('.docx')) {
        try {
            const mammoth = await getMammoth();
            const result = await mammoth.extractRawText({ buffer });
            console.log(`[EXTRACT] DOCX parsed: ${result.value?.length || 0} chars.`);
            return result.value || "";
        } catch (err: any) {
            console.error("[EXTRACT] Mammoth failed:", err);
            throw new Error(`Error leyendo DOCX: ${err.message}`);
        }
    } else {
        throw new Error("Formato de archivo no compatible. Use PDF o DOCX.");
    }
}

async function askGeminiForData(text: string, fileBuffer?: Buffer, mimeType?: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not defined");

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = await getLatestModel('INGEST');
    const model = genAI.getGenerativeModel({ model: modelName });

    let contents: any[] = [];
    const isVision = fileBuffer && mimeType === 'application/pdf';

    const prompt = `
    Eres un experto en lectura de documentos notariales argentinos (escrituras, minutas, etc).
    Tu tarea es extraer información precisa y estructurada en formato JSON puro.
    
    ${isVision ? "Analiza VISUALMENTE el documento adjunto..." : "Analiza el siguiente texto legal extraído..."}

    INSTRUCCIONES CRÍTICAS (PROGRAMA - ETAPA 1):
    1. Extrae TODOS los clientes/partes mencionadas.
    2. Para cada persona, identifica: nombre_completo, nacionalidad, fecha_nacimiento (YYYY-MM-DD), dni (solo números), cuit, estado_civil, nombres_padres (si es soltero), domicilio, email, telefono, y rol (VENDEDOR o COMPRADOR).
    3. Extrae TODOS los inmuebles mencionados.
    4. Para cada inmueble, identifica: partido, partida, nomenclatura (Circ, Secc, etc), y transcripcion_literal.

    ESQUEMA JSON REQUERIDO:
    {
      "clientes": [
        {
          "nombre_completo": "string",
          "nacionalidad": "string",
          "fecha_nacimiento": "YYYY-MM-DD",
          "dni": "string",
          "cuit": "string",
          "estado_civil": "string",
          "nombres_padres": "string",
          "domicilio": "string",
          "email": "string",
          "telefono": "string",
          "rol": "VENDEDOR|COMPRADOR"
        }
      ],
      "inmuebles": [
        {
          "partido": "string",
          "partida": "string",
          "transcripcion_literal": "string",
          "nomenclatura": "string"
        }
      ]
    }
    
    Devuelve SOLO el JSON.
    `;

    if (isVision) {
        contents = [
            { text: prompt },
            { inlineData: { data: fileBuffer!.toString('base64'), mimeType: mimeType! } }
        ];
        if (text && text.trim().length > 0) {
            contents.push({ text: `Referencia adicional:\n${text.substring(0, 10000)}` });
        }
    } else {
        contents = [{ text: `${prompt}\n\nCONTENIDO:\n${text.substring(0, 45000)}` }];
    }

    const MAX_RETRIES = 3;
    let lastError: any = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            console.log(`[AI] Attempt ${attempt + 1}/${MAX_RETRIES} using ${modelName}...`);
            const result = await model.generateContent(contents);
            const responseText = result.response.text();

            if (!responseText || responseText.trim().length === 0) {
                throw new Error("Gemini devolvió respuesta vacía.");
            }

            const cleanJson = responseText.replace(/```json|```/g, "").trim();
            try {
                return JSON.parse(cleanJson);
            } catch (e) {
                const match = responseText.match(/\{[\s\S]*\}/);
                if (match) return JSON.parse(match[0]);
                throw e;
            }
        } catch (err: any) {
            lastError = err;
            console.error(`[AI] Attempt ${attempt + 1} fail:`, err.message);
            const isTransient = err.message?.includes("fetch failed") || err.message?.includes("Error fetching") || err.message?.includes("503") || err.message?.includes("429");
            if (!isTransient && attempt === MAX_RETRIES - 1) break;
            if (attempt < MAX_RETRIES - 1) {
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }

    Sentry.captureException(lastError);
    throw lastError;
}

export async function GET() {
    return NextResponse.json({ status: "alive" });
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
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileName = file.name.toLowerCase();

        let extractedText = "";
        try {
            extractedText = await extractTextFromFile(file);
        } catch (err: any) {
            if (!fileName.endsWith('.pdf')) throw err;
        }

        let aiData;
        try {
            aiData = await askGeminiForData(extractedText, buffer, file.type || (fileName.endsWith('.pdf') ? 'application/pdf' : undefined));
        } catch (err: any) {
            return NextResponse.json({
                error: "Error en análisis IA",
                details: err.message?.substring(0, 150)
            }, { status: 500 });
        }

        const { clientes = [], inmuebles = [] } = aiData;

        // DB Ingestion
        const { data: carpeta, error: cError } = await supabase.from('carpetas').insert([{ caratula: `Ingesta: ${file.name}`, estado: 'ABIERTA' }]).select().single();
        if (cError) throw cError;

        const propertyIds: string[] = [];
        for (const i of inmuebles) {
            const { data, error } = await supabase.from('inmuebles').upsert({
                partido_id: i.partido || null,
                nro_partida: i.partida || null,
                nomenclatura_catastral: { literal: i.nomenclatura },
                transcripcion_literal: i.transcripcion_literal || null,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'partido_id,nro_partida' }).select().single();
            if (!error && data) propertyIds.push(data.id);
        }

        const { data: escritura } = await supabase.from('escrituras').insert([{ carpeta_id: carpeta.id, inmueble_princ_id: propertyIds[0] || null }]).select().single();
        if (escritura) {
            const { data: operacion } = await supabase.from('operaciones').insert([{ escritura_id: escritura.id, tipo_acto: 'COMPRAVENTA' }]).select().single();
            for (const c of clientes) {
                const taxId = c.cuit || c.dni || null;
                if (!taxId || !c.nombre_completo) continue;
                const { data: persona } = await supabase.from('personas').upsert({
                    tax_id: normalizeID(taxId),
                    nombre_completo: toTitleCase(c.nombre_completo),
                    nacionalidad: c.nacionalidad ? toTitleCase(c.nacionalidad) : null,
                    fecha_nacimiento: c.fecha_nacimiento || null,
                    domicilio_real: { literal: c.domicilio },
                    estado_civil_detallado: { estado: c.estado_civil, padres: c.nombres_padres },
                    contacto: { email: c.email, telefono: c.telefono },
                    origen_dato: 'IA_OCR',
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'tax_id' }).select().single();

                if (persona && operacion) {
                    await supabase.from('participantes_operacion').insert([{ operacion_id: operacion.id, persona_id: persona.tax_id, rol: c.rol || 'VENDEDOR' }]);
                }
            }
        }

        return NextResponse.json({ folderId: carpeta.id, entities: { clients: clientes.length, assets: inmuebles.length } });
    } catch (error: any) {
        console.error('[INGEST] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
