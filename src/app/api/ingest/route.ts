import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
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
    const mammoth = await import("mammoth") as any;
    return mammoth.default || mammoth;
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
      ACTÚA COMO UN ESCRIBANO EXPERTO. Tienes el documento COMPLETO (puede tener 25+ páginas).
      Tu trabajo NO ES RESUMIR. Tu trabajo es EXTRAER CON EXACTITUD LITERAL.

      TU MISIÓN DE ESCANEO (PASO 1):
      1. COMPARECIENTES/PARTES: Localiza todas las personas intervinientes (físicas o jurídicas). Pueden ser: Vendedores, Compradores, Apoderados, Representantes, Cónyuges que prestan asentimiento, etc.
         - Nombre y Apellidos completos.
         - Nacionalidad.
         - Fecha de nacimiento (formato YYYY-MM-DD).
         - DNI y CUIT/CUIL.
         - Estado civil (ej: Casado en 1ras nupcias con..., Divorciado de...). 
         - SI ES SOLTERO/A: Extraer obligatoriamente nombres de los padres (hijo de... y de...).
         - Domicilio real completo.
         - Email y Teléfono (si figuran, si no pon null).
      
      2. INMUEBLE: Localiza la descripción técnica del inmueble.
         - Transcripción literal completa (COPIA TEXTUAL DESDE "Un lote de terreno..." HASTA EL FINAL DE LINDEROS Y SUPERFICIE).
         - Número de Partida Inmobiliaria.
         - Partido / Departamento (ej: Bahía Blanca).
         - Nomenclatura Catastral (Circ, Secc, Chacra, Manz, Parcela).
      
      3. METADATOS DE LA ESCRITURA (CRÍTICO):
         - numero_escritura: BUSCA "ESCRITURA NUMERO" y extrae el número. IMPORTANTE: Si está escrito en letras (ej: "DOSCIENTOS CUARENTA"), convierte a dígitos (240).
         - fecha_escritura: Fecha del documento (formato YYYY-MM-DD).
         - notario_interviniente: Nombre COMPLETO del escribano que autorizó el documento.
         - registro_notario: Número de registro del escribano (ej: "Registro 30 de Bahía Blanca").
         - numero_acto: BUSCA "Código" que aparece al lado del tipo de acto (ej: "COMPRAVENTA (Código 100-00)"). Extrae SOLO el código numérico (ej: "100-00"). IMPORTANTE: En los documentos se llama "Código" NO "número de acto".



      ESQUEMA JSON (ESTRICTO):
      {
        "resumen_acto": "string (ej: COMPRAVENTA)",
        "numero_escritura": "string o null",
        "fecha_escritura": "YYYY-MM-DD o null",
        "notario_interviniente": "string o null (nombre completo del escribano que autorizó el documento)",
        "registro_notario": "string o null (número de registro del escribano)",
        "numero_acto": "string o null (número del acto registrado)",
        "clientes": [
          {
            "rol": "VENDEDOR" | "COMPRADOR" | "APODERADO" | "CONYUGE" | "REPRESENTANTE",
            "nombre_completo": "string",
            "dni": "string",
            "cuit": "string o null",
            "nacionalidad": "string",
            "fecha_nacimiento": "YYYY-MM-DD o null",
            "estado_civil": "string detallado",
            "nombres_padres": "string o null (extraer si es soltero o si figura filiación)",
            "conyuge": "string o null",
            "domicilio_real": "string",
            "email": "string o null",
            "telefono": "string o null"
          }
        ],
        "inmuebles": [
          {
            "partido": "string",
            "nomenclatura": "string",
            "partida_inmobiliaria": "string",
            "transcripcion_literal": "COPIA TEXTUAL COMPLETA Y LARGA DE LA DESCRIPCIÓN DEL INMUEBLE",
            "valuacion_fiscal": 0
          }
        ]
      }
    `;


    let contents: any[] = [{ text: prompt }];
    if (isVision) {
        contents.push({ inlineData: { data: fileBuffer!.toString('base64'), mimeType: mimeType! } });
        if (text) contents.push({ text: `Texto extraído por OCR como referencia (completo):\n${text.substring(0, 200000)}` });
    } else {
        const textToProcess = text.substring(0, 200000);
        contents.push({ text: `CONTENIDO DEL DOCUMENTO (HASTA 80 PÁGINAS):\n${textToProcess}` });
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
            console.log("🔥 AI EXTRACTED DATA:", JSON.stringify(parsedData, null, 2));

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

        console.log(`[INGEST] Iniciando procesamiento para: ${file.name}`);

        // Debug env
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error("[INGEST] CRÍTICO: SUPABASE_SERVICE_ROLE_KEY no está definido");
        }
        if (!process.env.GEMINI_API_KEY) {
            console.error("[INGEST] CRÍTICO: GEMINI_API_KEY no está definido");
        }

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

        const { clientes = [], inmuebles = [], resumen_acto, numero_escritura, fecha_escritura, notario_interviniente, registro_notario, numero_acto } = aiData;


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
            // Ensure we have Partido and Partida as they are often primary keys or unique identifiers
            if (!i.partida_inmobiliaria) continue;

            const { data, error } = await supabase.from('inmuebles').upsert({
                partido_id: i.partido || 'BAHIA BLANCA', // Default or extracted
                nro_partida: i.partida_inmobiliaria,
                nomenclatura: i.nomenclatura || null,
                transcripcion_literal: i.transcripcion_literal || null,
                valuacion_fiscal: i.valuacion_fiscal || 0,
            }, { onConflict: 'partido_id,nro_partida' }).select().single();

            if (!error && data) propertyIds.push(data.id);
            if (error) console.error("[INGEST] Error Inserting Inmueble:", error);
        }

        // Upload document to Supabase Storage
        let fileUrl: string | null = null;
        try {
            // Generate unique filename with timestamp
            const timestamp = Date.now();
            const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `documents/${timestamp}_${safeFileName}`;

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                .from('escrituras')
                .upload(storagePath, buffer, {
                    contentType: file.type,
                    upsert: false
                });

            if (uploadError) {
                console.error("[INGEST] Error uploading file:", uploadError);
            } else {
                // Generate signed URL with expiration (1 year = 31536000 seconds)
                const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
                    .from('escrituras')
                    .createSignedUrl(storagePath, 31536000); // 1 year expiration

                if (urlError) {
                    console.error("[INGEST] Error generating signed URL:", urlError);
                } else if (signedUrlData) {
                    fileUrl = signedUrlData.signedUrl;
                    console.log("[INGEST] File uploaded successfully with signed URL");
                }
            }
        } catch (uploadErr: any) {
            console.error("[INGEST] Error en upload (catch):", uploadErr);
        }

        // 3. Escritura
        const nroProtocolo = numero_escritura ? parseInt(numero_escritura, 10) : null;
        const { data: escritura, error: escError } = await supabase.from('escrituras').insert([{
            carpeta_id: carpeta.id,
            nro_protocolo: isNaN(nroProtocolo!) ? null : nroProtocolo,
            fecha_escritura: fecha_escritura,
            inmueble_princ_id: propertyIds[0] || null,
            contenido_borrador: `Borrador generado para: ${resumen_acto}`,
            notario_interviniente: notario_interviniente || null,
            registro: registro_notario || null,
            pdf_url: fileUrl // Save the uploaded file URL
        }]).select().single();


        if (escError) {
            console.error("[INGEST] Error creating escritura:", escError);
            throw new Error(`Error creando escritura: ${escError.message}`);
        }

        if (escritura) {
            const { data: operacion } = await supabase.from('operaciones').insert([{
                escritura_id: escritura.id,
                tipo_acto: resumen_acto || 'COMPRAVENTA',
                nro_acto: numero_acto || null
            }]).select().single();


            // 4. Clientes & Fichas
            for (const c of clientes) {
                const dni = normalizeID(c.dni) || null;
                const cuit = c.cuit ? normalizeID(c.cuit) : null;

                if (!dni || !c.nombre_completo) continue;

                // Create/Update Persona
                const { data: persona, error: pError } = await supabase.from('personas').upsert({
                    dni: dni,
                    cuit: cuit,
                    nombre_completo: toTitleCase(c.nombre_completo),
                    nacionalidad: c.nacionalidad ? toTitleCase(c.nacionalidad) : null,
                    fecha_nacimiento: c.fecha_nacimiento || null,
                    domicilio_real: { literal: c.domicilio_real },
                    nombres_padres: c.nombres_padres || null,
                    estado_civil_detalle: c.estado_civil || null,
                    datos_conyuge: c.conyuge ? { nombre: c.conyuge } : null,
                    estado_civil_detallado: {
                        estado: c.estado_civil,
                        padres: c.nombres_padres,
                        conyuge: c.conyuge
                    },
                    contacto: { email: c.email || null, telefono: c.telefono || null },
                    origen_dato: 'IA_OCR',
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'dni' }).select().single();

                if (pError) {
                    console.error("[INGEST] Error Persona:", pError);
                    continue;
                }

                if (persona) {
                    // Create Operation Participant
                    if (operacion) {
                        await supabase.from('participantes_operacion').insert([{
                            operacion_id: operacion.id,
                            persona_id: persona.dni,
                            rol: c.rol?.toUpperCase() || 'VENDEDOR'
                        }]);
                    }

                    // GENERATE TOKEN FOR FICHA
                    const expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

                    await supabase.from('fichas_web_tokens').insert([{
                        persona_id: persona.dni,
                        estado: 'PENDIENTE',
                        expires_at: expiresAt.toISOString()
                    }]);
                }
            }
        }

        return NextResponse.json({
            success: true,
            folderId: carpeta.id,
            debug: { clients: clientes.length, assets: inmuebles.length },
            extractedData: aiData
        });

    } catch (error: any) {
        console.error('[INGEST] ❌ Fatal Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() { return NextResponse.json({ status: "alive" }); }
