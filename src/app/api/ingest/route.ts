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
      ACTÚA COMO UN ESCRIBANO EXPERTO. Tienes el documento COMPLETO.
      Tu trabajo es EXTRAER CON EXACTITUD LITERAL.

      TU MISIÓN DE ESCANEO (PASO 1):
      1. COMPARECIENTES/PARTES: Localiza todas las personas intervinientes.
         - Nombre y Apellidos completos.
         - Nacionalidad (Ej: "Argentino", "Uruguayo").
         - Fecha de nacimiento (formato YYYY-MM-DD).
         - DNI y CUIT/CUIL. (IMPORTANTE: Extrae TODOS los números. Si el CUIT contiene al DNI, asegúrate de extraer ambos correctamente. El DNI suele tener 7 u 8 dígitos).
         - Estado civil detallado (Ej: "Casado en primeras nupcias con [Nombre]", "Divorciado de [Nombre]"). 
         - FILIACIÓN: Extraer nombres de los padres (Ej: "hijo de Ernesto y de Maria").
         - Domicilio real completo.
         - Email y Teléfono (si figuran, si no pon null).
      
      2. INMUEBLE: Localiza la descripción técnica del inmueble.
         - Transcripción literal completa (MUY IMPORTANTE: COPIA TEXTUAL DESDE "Un lote de terreno..." HASTA EL FINAL DE LINDEROS Y SUPERFICIE. Debe ser el párrafo largo y técnico).
         - Número de Partida Inmobiliaria.
         - Partido / Departamento (ej: Bahía Blanca).
         - Nomenclatura Catastral (Circ, Secc, Chacra, Manz, Parcela).
      
      3. METADATOS DE LA ESCRITURA (CRÍTICO):
         - numero_escritura: BUSCA "ESCRITURA NUMERO" y extrae el número. Convierte a dígitos si está en letras.
         - fecha_escritura: Fecha del documento (formato YYYY-MM-DD).
         - notario_interviniente: Nombre COMPLETO del escribano.
         - registro_notario: Número de registro del escribano.
         - numero_acto: BUSCA "Código" que aparece al lado del tipo de acto (ej: "COMPRAVENTA (Código 100-00)").

      ESQUEMA JSON (ESTRICTO):
      {
        "resumen_acto": "string",
        "numero_escritura": "string",
        "fecha_escritura": "YYYY-MM-DD",
        "notario_interviniente": "string",
        "registro_notario": "string",
        "numero_acto": "string",
        "clientes": [
          {
            "rol": "VENDEDOR" | "COMPRADOR" | "APODERADO" | "CONYUGE",
            "nombre_completo": "string",
            "dni": "string (SOLO NÚMEROS)",
            "cuit": "string (SOLO NÚMEROS, sin guiones)",
            "nacionalidad": "string",
            "fecha_nacimiento": "YYYY-MM-DD",
            "estado_civil": "string",
            "nombres_padres": "string",
            "conyuge": "string",
            "domicilio_real": "string",
            "email": "string",
            "telefono": "string"
          }
        ],
        "inmuebles": [
          {
            "partido": "string",
            "nomenclatura": "string",
            "partida_inmobiliaria": "string",
            "transcripcion_literal": "string",
            "valuacion_fiscal": 0
          }
        ]
      }
    `;

    let contents: any[] = [{ text: prompt }];
    if (isVision) {
        contents.push({ inlineData: { data: fileBuffer!.toString('base64'), mimeType: mimeType! } });
        if (text) contents.push({ text: `Texto extraído por OCR como referencia:\n${text.substring(0, 500000)}` });
    } else {
        const textToProcess = text.substring(0, 500000);
        contents.push({ text: `CONTENIDO DEL DOCUMENTO:\n${textToProcess}` });
    }

    const MAX_RETRIES = 3;
    let lastError: any = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            console.log(`[AI] Intento ${attempt + 1}/${MAX_RETRIES}...`);
            const result = await model.generateContent(contents);
            const responseText = result.response.text();
            if (!responseText) throw new Error("Respuesta vacía de la IA");
            const cleanJson = responseText.replace(/```json|```/g, "").trim();
            const parsedData = JSON.parse(cleanJson);
            console.log("🔥 AI EXTRACTED DATA SUCCESS");
            return parsedData;
        } catch (err: any) {
            lastError = err;
            console.error(`[AI] Error:`, err.message);
            if (attempt < MAX_RETRIES - 1) await new Promise(r => setTimeout(r, 2000));
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
            aiData = await askGeminiForData(extractedText, buffer, file.type || (fileName.endsWith('.pdf') ? 'application/pdf' : 'application/pdf'));
        } catch (err: any) {
            return NextResponse.json({ error: "Error en análisis IA", details: err.message }, { status: 500 });
        }

        const { clientes = [], inmuebles = [], resumen_acto, numero_escritura, fecha_escritura, notario_interviniente, registro_notario, numero_acto } = aiData;

        // 1. Create Carpeta
        const { data: carpeta, error: cError } = await supabase
            .from('carpetas')
            .insert([{
                caratula: `${resumen_acto || 'Ingesta'}: ${file.name}`,
                estado: 'ABIERTA',
                resumen_ia: resumen_acto
            }])
            .select()
            .single();
        if (cError) throw cError;

        // 2. Process Inmuebles
        const propertyIds: string[] = [];
        for (const i of inmuebles) {
            if (!i.partida_inmobiliaria) continue;
            const { data: inmueble, error: iError } = await supabase.from('inmuebles').upsert({
                partido_id: i.partido || 'BAHIA BLANCA',
                nro_partida: i.partida_inmobiliaria,
                nomenclatura: i.nomenclatura || null,
                transcripcion_literal: i.transcripcion_literal || null,
                valuacion_fiscal: i.valuacion_fiscal || 0,
            }, { onConflict: 'partido_id,nro_partida' }).select().single();
            if (inmueble) propertyIds.push(inmueble.id);
        }

        // 3. Upload File
        let fileUrl: string | null = null;
        try {
            const safeName = (file.name || "documento").replace(/[^a-zA-Z0-9.-]/g, '_');
            const path = `documents/${Date.now()}_${safeName}`;
            const { error: uploadError } = await supabaseAdmin.storage.from('escrituras').upload(path, buffer);
            if (!uploadError) {
                const { data: signed } = await supabaseAdmin.storage.from('escrituras').createSignedUrl(path, 31536000);
                fileUrl = signed?.signedUrl || null;
            }
        } catch (e) {
            console.error("Storage error:", e);
        }

        // 4. Create Escritura
        const { data: escritura, error: eError } = await supabase.from('escrituras').insert([{
            carpeta_id: carpeta.id,
            nro_protocolo: numero_escritura ? parseInt(numero_escritura, 10) : null,
            fecha_escritura: fecha_escritura,
            inmueble_princ_id: propertyIds[0] || null,
            notario_interviniente,
            registro: registro_notario,
            pdf_url: fileUrl
        }]).select().single();
        if (eError) throw eError;

        // 5. Create Operacion
        const { data: operacion } = await supabase.from('operaciones').insert([{
            escritura_id: escritura.id,
            tipo_acto: resumen_acto || 'COMPRAVENTA',
            nro_acto: numero_acto || null
        }]).select().single();

        // 6. Process Clientes
        for (const c of clientes) {
            const dni = normalizeID(c.dni);
            if (!dni) continue;

            const { data: persona } = await supabase.from('personas').upsert({
                dni,
                nombre_completo: toTitleCase(c.nombre_completo),
                cuit: normalizeID(c.cuit),
                nacionalidad: c.nacionalidad ? toTitleCase(c.nacionalidad) : null,
                fecha_nacimiento: c.fecha_nacimiento,
                domicilio_real: c.domicilio_real ? { literal: c.domicilio_real } : null,
                nombres_padres: c.nombres_padres,
                estado_civil_detalle: c.estado_civil,
                datos_conyuge: c.conyuge ? { nombre: c.conyuge } : null,
                contacto: { email: c.email, telefono: c.telefono },
                origen_dato: 'IA_OCR',
                updated_at: new Date().toISOString()
            }, { onConflict: 'dni' }).select().single();

            if (persona && operacion) {
                await supabase.from('participantes_operacion').insert([{
                    operacion_id: operacion.id,
                    persona_id: persona.dni,
                    rol: c.rol?.toUpperCase() || 'VENDEDOR'
                }]);

                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 30);
                await supabase.from('fichas_web_tokens').insert([{
                    persona_id: persona.dni,
                    estado: 'PENDIENTE',
                    expires_at: expiresAt.toISOString()
                }]);
            }
        }

        return NextResponse.json({
            success: true,
            folderId: carpeta.id,
            debug: { clients: clientes.length, assets: inmuebles.length },
            extractedData: aiData
        });
    } catch (error: any) {
        console.error('Fatal Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() { return NextResponse.json({ status: "alive" }); }
