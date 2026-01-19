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
      Eres un Oficial de Notaría experto y extremadamente meticuloso.
      Tu trabajo NO ES RESUMIR. Tu trabajo es EXTRAER CON EXACTITUD LITERAL.

      Analiza el documento y extrae el siguiente JSON. Si un dato no está, usa null.

      REGLAS DE ORO DE EXTRACCIÓN:
      1. PARA "transcripcion_literal" (INMUEBLES): BUSCA la descripción técnica del lote (medidas, linderos, superficie, antecedentes). COPIA EL BLOQUE DE TEXTO EXACTO Y COMPLETO. No omitas ni una coma.
      2. PARA "nombres_padres": Si la persona es soltera o se menciona su filiación, BUSCA la frase "hijo de... y de...". EXTRAE LOS NOMBRES COMPLETOS.
      3. PARA "estado_civil": No pongas solo una palabra. Extrae la condición completa (ej: "Casado en primeras nupcias con Maria Perez", "Soltero", "Divorciado de...").
      4. PARA "domicilio_real": Extrae la dirección completa (calle, número, ciudad, provincia).
      5. PARA "fecha_escritura": Asegúrate de que el formato sea YYYY-MM-DD.

      ESQUEMA JSON (ESTRICTO):
      {
        "resumen_acto": "Breve descripción (ej: Compraventa de Inmueble)",
        "numero_escritura": "string o null",
        "fecha_escritura": "YYYY-MM-DD o null",
        "clientes": [
          {
            "rol": "VENDEDOR" | "COMPRADOR",
            "nombre_completo": "string",
            "dni": "Solo números",
            "cuit": "Solo números o null",
            "nacionalidad": "Ej: Argentino/a",
            "fecha_nacimiento": "YYYY-MM-DD o null",
            "estado_civil": "Detalle completo (hijo de, casado con, etc)",
            "nombres_padres": "Nombres de los padres si figuran",
            "conyuge": "Nombre del cónyuge si figura",
            "domicilio_real": "string completo",
            "email": null,
            "telefono": null
          }
        ],
        "inmuebles": [
          {
            "partido": "string",
            "nomenclatura": "string (Circ, Secc, Chacra, Manz, Parc)",
            "partida_inmobiliaria": "Solo números",
            "transcripcion_literal": "BLOQUE TEXTUAL COMPLETO DE DESCRIPCION Y LINDEROS",
            "valuacion_fiscal": 0
          }
        ]
      }
    `;

    let contents: any[] = [{ text: prompt }];
    if (isVision) {
        contents.push({ inlineData: { data: fileBuffer!.toString('base64'), mimeType: mimeType! } });
        if (text) contents.push({ text: `Texto extraído por OCR como referencia:\n${text.substring(0, 15000)}` });
    } else {
        // Boost priority for relevant keywords in long texts
        const textToProcess = text.substring(0, 45000);
        contents.push({ text: `CONTENIDO DEL DOCUMENTO:\n${textToProcess}` });
    }

    const MAX_RETRIES = 3;
    let lastError: any = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            console.log(`[AI] Intento AGRESIVO ${attempt + 1}/${MAX_RETRIES} (${modelName})...`);
            const result = await model.generateContent(contents);
            const responseText = result.response.text();
            const cleanJson = responseText.replace(/```json|```/g, "").trim();
            const parsedData = JSON.parse(cleanJson);

            // DEBUG MODE: Log the extracted data for production audit
            console.log("EXTRACTED DATA (DEBUG):", JSON.stringify(parsedData, null, 2));

            return parsedData;
        } catch (err: any) {
            lastError = err;
            console.error(`[AI] Error en extracción:`, err.message);
            const isTransient = err.message?.includes("fetch failed") || err.message?.includes("503") || err.message?.includes("429") || err.message?.includes("finishReason: RECITATION");
            if (!isTransient && attempt === MAX_RETRIES - 1) break;
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
        if (!file) return NextResponse.json({ error: "No se encontró el archivo" }, { status: 400 });

        console.log(`[INGEST] Overhaul Agresivo para: ${file.name}`);

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
            return NextResponse.json({ error: "Error en análisis IA Agresivo", details: err.message }, { status: 500 });
        }

        const { clientes = [], inmuebles = [], resumen_acto, numero_escritura, fecha_escritura } = aiData;

        // 1. Carpeta
        const { data: carpeta, error: cError } = await supabase
            .from('carpetas')
            .insert([{
                caratula: `${resumen_acto || 'Ingesta'}: ${file.name}`,
                estado: 'ABIERTA',
                resumen_ia: resumen_acto
            }])
            .select()
            .single();
        if (cError) throw new Error(`Error Carpeta: ${cError.message}`);

        // 2. Inmuebles
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

        // 3. Escritura
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

            // 4. Clientes
            for (const c of clientes) {
                const taxId = c.cuit || c.dni || null;
                if (!taxId || !c.nombre_completo) continue;

                // Create Persona
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
                    contacto: { email: null, telefono: null },
                    origen_dato: 'IA_OVERHAUL_AGRESIVO',
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

        return NextResponse.json({
            success: true,
            folderId: carpeta.id,
            debug: { clients: clientes.length, assets: inmuebles.length }
        });

    } catch (error: any) {
        console.error('[INGEST] ❌ Fatal Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() { return NextResponse.json({ status: "alive" }); }
