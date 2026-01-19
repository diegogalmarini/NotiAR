import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { normalizeID, toTitleCase } from '@/lib/utils/normalization';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getLatestModel } from '@/lib/aiConfig';
import * as Sentry from "@sentry/nextjs";

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
        throw new Error("El formato .doc no es seguro. Use PDF o .docx.");
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (fileName.endsWith('.pdf')) {
        try {
            const pdfParser = await getPdfParser();
            const data = await pdfParser(buffer);
            return data.text || "";
        } catch (err: any) {
            console.error("[EXTRACT] PDF Error:", err);
            return "";
        }
    } else if (fileName.endsWith('.docx')) {
        try {
            const mammoth = await getMammoth();
            const result = await mammoth.extractRawText({ buffer });
            return result.value || "";
        } catch (err: any) {
            console.error("[EXTRACT] DOCX Error:", err);
            throw new Error(`Error leyendo DOCX: ${err.message}`);
        }
    } else {
        throw new Error("Formato no compatible (PDF/DOCX).");
    }
}

async function askGeminiForData(text: string, fileBuffer?: Buffer, mimeType?: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY no definido");

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = await getLatestModel('INGEST');
    const model = genAI.getGenerativeModel({ model: modelName });

    const isVision = fileBuffer && mimeType === 'application/pdf';

    const prompt = `
      Actúa como un Oficial de Notaría experto. Analiza el siguiente documento legal (Escritura o Título).
      Tu objetivo es extraer datos estructurados precisos.
      
      ESQUEMA JSON REQUERIDO (ESTRICTO):
      {
        "resumen_acto": "Breve descripción (ej: Compraventa Inmueble)",
        "numero_escritura": "string o null",
        "fecha_escritura": "YYYY-MM-DD o null",
        "clientes": [
          {
            "rol": "VENDEDOR" o "COMPRADOR",
            "nombre_completo": "string",
            "dni": "Solo números",
            "cuit": "Solo números o null",
            "nacionalidad": "Ej: Argentino",
            "fecha_nacimiento": "YYYY-MM-DD o null",
            "estado_civil": "Soltero/Casado/Divorciado/Viudo",
            "nombres_padres": "Nombres completos de los padres",
            "conyuge": "Nombre del cónyuge o null",
            "domicilio_real": "string",
            "email": null,
            "telefono": null
          }
        ],
        "inmuebles": [
          {
            "partido": "Ej: Bahía Blanca",
            "nomenclatura": "Circ, Secc, Manz, Parc...",
            "partida_inmobiliaria": "Solo números",
            "transcripcion_literal": "COPIA TEXTUAL de la descripción catastral del lote",
            "valuacion_fiscal": 0
          }
        ]
      }

      INSTRUCCIONES:
      - Devuelve SOLO el JSON.
      - Si falta un dato, usa null.
      - No inventes información.
    `;

    let contents: any[] = [{ text: prompt }];
    if (isVision) {
        contents.push({ inlineData: { data: fileBuffer!.toString('base64'), mimeType: mimeType! } });
        if (text) contents.push({ text: `Texto extraíble como referencia:\n${text.substring(0, 10000)}` });
    } else {
        contents.push({ text: `CONTENIDO DEL DOCUMENTO:\n${text.substring(0, 40000)}` });
    }

    const MAX_RETRIES = 3;
    let lastError: any = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            console.log(`[AI] Intento ${attempt + 1}/${MAX_RETRIES} (${modelName})...`);
            const result = await model.generateContent(contents);
            const responseText = result.response.text();
            const cleanJson = responseText.replace(/```json|```/g, "").trim();
            return JSON.parse(cleanJson);
        } catch (err: any) {
            lastError = err;
            console.error(`[AI] Fallo ${attempt + 1}:`, err.message);
            const isTransient = err.message?.includes("fetch failed") || err.message?.includes("503") || err.message?.includes("429");
            if (!isTransient) break;
            if (attempt < MAX_RETRIES - 1) await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        }
    }

    Sentry.captureException(lastError);
    throw lastError;
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

        console.log(`[INGEST] Iniciando proceso robusto para: ${file.name}`);

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
            return NextResponse.json({ error: "Error en análisis IA", details: err.message }, { status: 500 });
        }

        const { clientes = [], inmuebles = [], resumen_acto, numero_escritura, fecha_escritura } = aiData;

        // --- TRANSACCIÓN DE PERSISTENCIA ---

        // 1. Crear Carpeta
        const { data: carpeta, error: cError } = await supabase
            .from('carpetas')
            .insert([{ caratula: `Ingesta: ${file.name}`, estado: 'ABIERTA', resumen_ia: resumen_acto }])
            .select()
            .single();
        if (cError) throw new Error(`Error Carpeta: ${cError.message}`);

        // 2. Procesar Inmuebles
        const propertyIds: string[] = [];
        for (const i of inmuebles) {
            const { data, error } = await supabase.from('inmuebles').upsert({
                partido_id: i.partido || null,
                nro_partida: i.partida_inmobiliaria || null,
                nomenclatura_catastral: { literal: i.nomenclatura },
                transcripcion_literal: i.transcripcion_literal || null,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'partido_id,nro_partida' }).select().single();
            if (!error && data) propertyIds.push(data.id);
        }

        // 3. Crear Escritura y Operación
        const { data: escritura } = await supabase.from('escrituras').insert([{
            carpeta_id: carpeta.id,
            nro_protocolo: numero_escritura,
            fecha_escritura: fecha_escritura,
            inmueble_princ_id: propertyIds[0] || null,
            contenido_borrador: `Borrador generado para: ${resumen_acto}`
        }]).select().single();

        if (escritura) {
            const { data: operacion } = await supabase.from('operaciones').insert([{
                escritura_id: escritura.id,
                tipo_acto: resumen_acto || 'COMPRAVENTA'
            }]).select().single();

            // 4. Procesar Clientes
            for (const c of clientes) {
                const taxId = c.cuit || c.dni || null;
                if (!taxId || !c.nombre_completo) continue;

                const { data: persona } = await supabase.from('personas').upsert({
                    tax_id: normalizeID(taxId),
                    nombre_completo: toTitleCase(c.nombre_completo),
                    dni: c.dni || null,
                    cuit: c.cuit || null,
                    nacionalidad: c.nacionalidad ? toTitleCase(c.nacionalidad) : null,
                    fecha_nacimiento: c.fecha_nacimiento || null,
                    domicilio_real: { literal: c.domicilio_real },
                    estado_civil_detallado: {
                        estado: c.estado_civil,
                        padres: c.nombres_padres,
                        conyuge: c.conyuge
                    },
                    contacto: { email: c.email, telefono: c.telefono },
                    origen_dato: 'IA_OCR_ROBUST',
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'tax_id' }).select().single();

                if (persona && operacion) {
                    await supabase.from('participantes_operacion').insert([{
                        operacion_id: operacion.id,
                        persona_id: persona.tax_id,
                        rol: c.rol || 'VENDEDOR'
                    }]);
                }
            }
        }

        console.log(`[INGEST] ✅ Éxito: Carpeta ${carpeta.id}`);
        return NextResponse.json({ folderId: carpeta.id, entities: { clients: clientes.length, assets: inmuebles.length } });

    } catch (error: any) {
        console.error('[INGEST] ❌ Fatal:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() { return NextResponse.json({ status: "alive" }); }
