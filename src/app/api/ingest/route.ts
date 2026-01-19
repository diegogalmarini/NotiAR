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

async function getWordExtractor() {
    return await import("word-extractor") as any;
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
        try {
            const WordExtractor = (await getWordExtractor()) as any;
            const extractor = new WordExtractor.default();
            const doc = await extractor.extract(buffer);
            return doc.getBody();
        } catch (err: any) {
            console.error("Error parsing .doc:", err);
            throw new Error(`Error al leer el archivo .doc: ${err.message}`);
        }
    } else {
        throw new Error("Formato de archivo no compatible. Use PDF, DOC o DOCX.");
    }
}

async function askGeminiForData(text: string, fileBuffer?: Buffer, mimeType?: string) {
    // Upgraded to 1.5 Pro for maximum precision as requested by user
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    let contents: any[] = [];

    const prompt = `
    Eres un experto en lectura de documentos notariales argentinos (escrituras, minutas, etc).
    Tu tarea es extraer información precisa y estructurada en formato JSON puro, sin bloques de código markdown.
    
    INSTRUCCIONES CRÍTICAS:
    1. Si el documento es un escaneo de baja calidad, usa tus capacidades de visión para interpretar cada palabra.
    2. Identifica correctamente nombres, DNI/CUIT (tax_id), estados civiles y fechas.
    3. Para inmuebles, busca: Partido, Partida y Nomenclatura Catastral (Circ, Secc, Chacra, Quinta, Fraccion, Manzana, Parcela, Subparcela).
    4. Identifica el acto (ej. COMPRAVENTA, HIPOTECA) y el rol del participante (ej. VENDEDOR, COMPRADOR).

    Extrae en este formato:
    {
      "persona": { "tax_id": "...", "nombre_completo": "...", "nacionalidad": "...", "fecha_nacimiento": "..." },
      "inmueble": { "partido_id": "...", "nro_partida": "...", "nomenclatura_catastral": { ... } },
      "operacion": { "tipo_acto": "...", "rol": "..." }
    }
    
    Si no encuentras un dato, usa null.
    `;

    if (fileBuffer && mimeType === 'application/pdf') {
        // Multimodal path for PDFs (better for OCR)
        contents = [
            { text: prompt },
            {
                inlineData: {
                    data: fileBuffer.toString('base64'),
                    mimeType: mimeType
                }
            }
        ];

        // Add text as additional context if available and short
        if (text && text.length > 0) {
            contents.push({ text: `Contexto de texto extraído (puede ser incompleto si es escaneado):\n${text.substring(0, 5000)}` });
        }
    } else {
        // Standard text path for DOC/DOCX
        contents = [{ text: `${prompt}\n\nTEXTO DEL DOCUMENTO:\n${text.substring(0, 30000)}` }];
    }

    const result = await model.generateContent(contents);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json|```/g, "").trim();

    try {
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("JSON Parse Error. Raw response:", responseText);
        // Fallback or attempt to fix common issues
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

        // 1. Extract Text (Fallback for PDFs, primary for DOC/DOCX)
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        let extractedText = "";
        try {
            extractedText = await extractTextFromFile(file);
        } catch (err) {
            console.warn("[INGEST] Text extraction failed, will rely on multimodal if PDF:", err);
        }

        // 2. AI Extraction
        let aiData;
        try {
            aiData = await askGeminiForData(
                extractedText,
                buffer,
                file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : undefined)
            );
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
