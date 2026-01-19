import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { normalizeID, toTitleCase } from '@/lib/utils/normalization';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getLatestModel } from '@/lib/aiConfig';

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
    const fileName = file.name.toLowerCase();
    console.log(`[EXTRACT] Starting extraction for ${fileName}...`);

    // Safety check for legacy binary formats that crash Vercel
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
            if (result.messages.length > 0) {
                console.warn("[EXTRACT] Mammoth messages:", result.messages);
            }
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
    const modelName = await getLatestModel('INGEST');
    const model = genAI.getGenerativeModel({ model: modelName });

    let contents: any[] = [];
    const isVision = fileBuffer && mimeType === 'application/pdf';

    const prompt = `
    Eres un experto en lectura de documentos notariales argentinos (escrituras, minutas, etc).
    Tu tarea es extraer información precisa y estructurada en formato JSON puro.
    
    ${isVision
            ? "Analiza VISUALMENTE el documento adjunto (incluyendo sellos, firmas y formato)..."
            : "Analiza el siguiente texto legal extraído..."}

    INSTRUCCIONES CRÍTICAS (PROGRAMA - ETAPA 1):
    1. Extrae TODOS los clientes/partes mencionadas.
    2. Para cada persona, identifica: nombre_completo, nacionalidad, fecha_nacimiento (YYYY-MM-DD), dni (solo números), cuit, estado_civil, nombres_padres (si es soltero), domicilio, email, telefono, y rol (VENDEDOR o COMPRADOR).
    3. Extrae TODOS los inmuebles mencionados.
    4. Para cada inmueble, identifica: partido, partida, nomenclatura (Circ, Secc, etc), y EXTREMADAMENTE IMPORTANTE: la transcripcion_literal (Copia textual de la descripción del inmueble).

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
    
    Si no encuentras un dato, usa null. Devuelve SOLO el JSON sin markdown.
    `;

    if (isVision) {
        contents = [
            { text: prompt },
            {
                inlineData: {
                    data: fileBuffer!.toString('base64'),
                    mimeType: mimeType!
                }
            }
        ];
        if (text && text.trim().length > 0) {
            contents.push({ text: `Texto extraído como referencia adicional:\n${text.substring(0, 10000)}` });
        }
    } else {
        contents = [{ text: `${prompt}\n\nCONTENIDO DEL DOCUMENTO:\n${text.substring(0, 45000)}` }];
    }

    const result = await model.generateContent(contents);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json|```/g, "").trim();

    try {
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("[JSON] Parse Error. Raw response:", responseText);
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw e;
    }
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

        // 1. Ingestion Strategy based on format
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileName = file.name.toLowerCase();

        let extractedText = "";

        // Handle .doc rejection before any expensive operation
        if (fileName.endsWith('.doc')) {
            return NextResponse.json({
                error: "El formato .doc (Word 97-2003) no es seguro. Por favor, abra el archivo y guárdelo como PDF o .docx antes de subirlo."
            }, { status: 400 });
        }

        try {
            extractedText = await extractTextFromFile(file);
        } catch (err: any) {
            console.warn("[INGEST] Text extraction warning:", err.message);
            // Non-fatal if it's a PDF, we'll rely on Vision
            if (!fileName.endsWith('.pdf')) throw err;
        }

        // 2. AI Extraction
        let aiData;
        try {
            // Validate extracted text before sending to AI (if not PDF)
            if (!fileName.endsWith('.pdf') && (!extractedText || extractedText.trim().length < 50)) {
                return NextResponse.json({
                    error: `El archivo ${fileName} parece estar vacío o no se ha podido extraer suficiente texto (${extractedText?.length || 0} caracteres).`
                }, { status: 400 });
            }

            aiData = await askGeminiForData(
                extractedText,
                buffer,
                file.type || (fileName.endsWith('.pdf') ? 'application/pdf' : undefined)
            );
            console.log(`[AI] Response entities: ${aiData.clientes?.length || 0} clients, ${aiData.inmuebles?.length || 0} assets.`);
        } catch (err) {
            console.error("[AI] Error during analysis:", err);
            return NextResponse.json({ error: "Error en el análisis de IA del documento." }, { status: 500 });
        }

        const { clientes = [], inmuebles = [] } = aiData;

        // 3. Create Folder
        const { data: carpeta, error: cError } = await supabase
            .from('carpetas')
            .insert([{ caratula: `Ingesta: ${file.name}`, estado: 'ABIERTA' }])
            .select().single();

        if (cError) throw cError;

        // 4. Ingest Inmuebles
        const propertyIds: string[] = [];
        for (const i of inmuebles) {
            const { data, error } = await supabase
                .from('inmuebles')
                .upsert({
                    partido_id: i.partido || null,
                    nro_partida: i.partida || null,
                    nomenclatura_catastral: { literal: i.nomenclatura },
                    transcripcion_literal: i.transcripcion_literal || null,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'partido_id,nro_partida' })
                .select().single();

            if (!error && data) propertyIds.push(data.id);
        }

        // 5. Ingest Personas linked to a default Operation
        // Create a single main Escritura for the folder
        const { data: escritura } = await supabase
            .from('escrituras')
            .insert([{
                carpeta_id: carpeta.id,
                inmueble_princ_id: propertyIds[0] || null
            }])
            .select().single();

        if (escritura) {
            const { data: operacion } = await supabase
                .from('operaciones')
                .insert([{
                    escritura_id: escritura.id,
                    tipo_acto: 'COMPRAVENTA' // Default for now
                }])
                .select().single();

            for (const c of clientes) {
                const taxId = c.cuit || c.dni || null;
                if (!taxId || !c.nombre_completo) continue;

                const { data: persona } = await supabase
                    .from('personas')
                    .upsert({
                        tax_id: normalizeID(taxId),
                        nombre_completo: toTitleCase(c.nombre_completo),
                        nacionalidad: c.nacionalidad ? toTitleCase(c.nacionalidad) : null,
                        fecha_nacimiento: c.fecha_nacimiento || null,
                        domicilio_real: { literal: c.domicilio },
                        estado_civil_detallado: { estado: c.estado_civil, padres: c.nombres_padres },
                        contacto: { email: c.email, telefono: c.telefono },
                        origen_dato: 'IA_OCR',
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'tax_id' })
                    .select().single();

                if (persona && operacion) {
                    await supabase
                        .from('participantes_operacion')
                        .insert([{
                            operacion_id: operacion.id,
                            persona_id: persona.tax_id,
                            rol: c.rol || 'VENDEDOR'
                        }]);
                }
            }
        }

        return NextResponse.json({
            message: 'Magic ingestion complete (Stage 1 Schema)',
            folderId: carpeta.id,
            entities: { clients: clientes.length, assets: inmuebles.length }
        });

    } catch (error: any) {
        console.error('[INGEST] API error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
