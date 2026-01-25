import { NextResponse, after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { normalizeID, toTitleCase } from '@/lib/utils/normalization';
import * as Sentry from "@sentry/nextjs";
import { SkillExecutor } from '@/lib/agent/SkillExecutor';
import { classifyDocument } from '@/lib/skills/routing/documentClassifier';

export const maxDuration = 300; // Increased timeout for Pro model processing (Anti-504)

// --- HELPERS ---

async function extractTextFromFile(file: File): Promise<string> {
    const fileName = file.name.toLowerCase();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (fileName.endsWith('.pdf')) {
        try {
            const pdf = await import("pdf-parse") as any;
            const pdfParser = pdf.default || pdf;
            const data = await pdfParser(buffer);
            return data.text || "";
        } catch (err: any) {
            console.error("[EXTRACT] PDF Error:", err);
            return "";
        }
    } else if (fileName.endsWith('.docx')) {
        try {
            const mammoth = await import("mammoth") as any;
            const mammothParser = mammoth.default || mammoth;
            const result = await mammothParser.extractRawText({ buffer });
            return result.value || "";
        } catch (err: any) {
            console.error("[EXTRACT] DOCX Error:", err);
            throw new Error(`Error leyendo DOCX: ${err.message}`);
        }
    }
    return "";
}

// --- MAIN ROUTE ---

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) return NextResponse.json({ error: "No se encontró el archivo" }, { status: 400 });

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // --- BACKGROUND PROCESSING CHECK ---
        // Threshold: > 3MB (common for 10+ page scanned PDFs)
        const isLarge = file.size > 3 * 1024 * 1024;

        if (isLarge) {
            console.log(`[PIPELINE] Async mode enabled for: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

            // 1. Create a "Placeholder" Carpeta immediately
            const { data: carpeta, error: cError } = await supabaseAdmin.from('carpetas').insert([{
                caratula: `PROCESANDO: ${file.name}`,
                estado: 'ABIERTA',
                resumen_ia: 'El documento es extenso. Procesando en segundo plano para evitar esperas...'
            }]).select().single();
            if (cError) throw cError;

            // 2. Trigger async processing (After response)
            after(async () => {
                try {
                    await processInBackground(file, buffer, carpeta.id);
                    revalidatePath('/carpetas');
                } catch (e) {
                    console.error("[BACKGROUND] Fatal error:", e);
                    Sentry.captureException(e);
                }
            });

            return NextResponse.json({
                success: true,
                status: 'PROCESSING',
                folderId: carpeta.id,
                message: "Documento extenso detectado. NotiAR está trabajando en segundo plano."
            });
        }

        // --- STANDARD SYNC PIPELINE ---
        let extractedText = "";
        try {
            extractedText = await extractTextFromFile(file);
        } catch (e) { }

        const classification = await classifyDocument(file, extractedText);
        console.log(`[PIPELINE] Document Classified as: ${classification.document_type}`);

        // 3. Dynamic Routing with Hybrid capability
        const aiData = await runExtractionPipeline(classification.document_type, file, extractedText);

        const result = await persistIngestedData(aiData, file, buffer);

        revalidatePath('/carpetas');
        revalidatePath('/dashboard');

        return NextResponse.json({
            success: true,
            status: 'COMPLETED',
            folderId: result.folderId,
            extractedData: aiData
        });

    } catch (error: any) {
        console.error("🔥 FULL INGESTION ERROR:", error);
        Sentry.captureException(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * runExtractionPipeline: Orchestrates the multi-model extraction logic.
 */
async function runExtractionPipeline(docType: string, file: File, extractedText: string) {
    let aiData: any = null;

    switch (docType) {
        case 'DNI':
        case 'PASAPORTE':
            aiData = await SkillExecutor.execute('notary-identity-vision', file, { extractedText });
            break;

        case 'ESCRITURA':
        case 'BOLETO_COMPRAVENTA':
            // The SkillExecutor.execute will internally decide to use Hybrid or Sync
            const entities = await SkillExecutor.execute('notary-entity-extractor', file, { text: extractedText });

            // Financial & Compliance Tools
            const taxes = await SkillExecutor.execute('notary-tax-calculator', undefined, {
                price: entities.operation_details?.price || 0,
                currency: entities.operation_details?.currency || 'USD'
            });
            const compliance = await SkillExecutor.execute('notary-uif-compliance', undefined, {
                price: entities.operation_details?.price || 0,
                moneda: entities.operation_details?.currency || 'USD',
                parties: entities.clientes || []
            });

            aiData = { ...entities, tax_calculation: taxes, compliance };
            break;

        default:
            aiData = await SkillExecutor.execute('notary-entity-extractor', file, { text: extractedText });
    }
    return aiData;
}

/**
 * processInBackground: Simulated background worker for Vercel.
 * Note: In a real high-traffic app, this would be a QStash or Inngest call.
 */
async function processInBackground(file: File, buffer: Buffer, folderId: string) {
    console.log(`[BACKGROUND] Starting processing for folder ${folderId}...`);

    let extractedText = "";
    try { extractedText = await extractTextFromFile(file); } catch (e) { }

    const classification = await classifyDocument(file, extractedText);
    const aiData = await runExtractionPipeline(classification.document_type, file, extractedText);

    // Update existing folder and link data
    await persistIngestedData(aiData, file, buffer, folderId);

    console.log(`[BACKGROUND] Processing COMPLETED for folder ${folderId}`);
}

/**
 * Persists the result of any skill into the Supabase database.
 * Maintain legacy support for carpetas / escrituras / personas.
 */
async function persistIngestedData(data: any, file: File, buffer: Buffer, existingFolderId?: string) {
    const {
        clientes = [],
        inmuebles = [],
        resumen_acto = 'Ingesta automática',
        operation_details = {},
        numero_escritura,
        fecha_escritura,
        notario_interviniente,
        registro_notario
    } = data;

    // 1. Resolve Carpeta
    let folderId = existingFolderId;
    if (!folderId) {
        const { data: carpeta, error: cError } = await supabaseAdmin
            .from('carpetas')
            .insert([{
                caratula: `Ingesta: ${file.name}`,
                estado: 'ABIERTA',
                resumen_ia: `Ingesta automática (${resumen_acto || 'Documento'})`
            }])
            .select()
            .single();
        if (cError) throw cError;
        folderId = carpeta.id;
    } else {
        // Update placeholder
        await supabaseAdmin.from('carpetas').update({
            caratula: `Finalizado: ${file.name}`,
            resumen_ia: `Procesamiento híbrido completado. Acto: ${resumen_acto}`
        }).eq('id', folderId);
    }

    // 2. Process Inmuebles
    const propertyIds: string[] = [];
    for (const i of inmuebles) {
        const { data: inmueble } = await supabase.from('inmuebles').upsert({
            partido_id: i.partido || 'BAHIA BLANCA',
            nro_partida: i.partida_inmobiliaria || `TEMP_${Date.now()}`,
            nomenclatura: i.nomenclatura || null,
            transcripcion_literal: i.transcripcion_literal || null,
            valuacion_fiscal: i.valuacion_fiscal || 0,
        }, { onConflict: 'partido_id,nro_partida' }).select().single();
        if (inmueble) propertyIds.push(inmueble.id);
    }

    // 3. Upload File
    let fileUrl: string | null = null;
    try {
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const path = `documents/${Date.now()}_${safeName}`;
        const { error: uploadError } = await supabaseAdmin.storage.from('escrituras').upload(path, buffer);
        if (!uploadError) {
            const { data: signed } = await supabaseAdmin.storage.from('escrituras').createSignedUrl(path, 31536000);
            fileUrl = signed?.signedUrl || null;
        }
    } catch (e) { }

    // 4. Create Escritura (if applicable)
    const { data: escritura } = await supabase.from('escrituras').insert([{
        carpeta_id: folderId,
        nro_protocolo: numero_escritura ? parseInt(numero_escritura, 10) : null,
        fecha_escritura: fecha_escritura || operation_details?.date,
        inmueble_princ_id: propertyIds[0] || null,
        notario_interviniente,
        registro: registro_notario,
        pdf_url: fileUrl,
        contenido_borrador: data.deed_draft || null,
        analysis_metadata: {
            tax_calculation: data.tax_calculation,
            compliance: data.compliance
        }
    }]).select().single();

    // 5. Process Personas
    for (const c of clientes) {
        const dni = normalizeID(c.dni);
        if (!dni) continue;

        await supabase.from('personas').upsert({
            dni,
            nombre_completo: toTitleCase(c.nombre_completo),
            cuit: normalizeID(c.cuit),
            nacionalidad: c.nacionalidad ? toTitleCase(c.nacionalidad) : null,
            fecha_nacimiento: c.fecha_nacimiento || null,
            domicilio_real: c.domicilio_real ? { literal: c.domicilio_real } : null,
            estado_civil_detalle: c.estado_civil || null,
            origen_dato: 'IA_ORCHESTRATOR',
            updated_at: new Date().toISOString()
        }, { onConflict: 'dni' });

        if (escritura) {
            // Link to operation
            const { data: operacion } = await supabase.from('operaciones').select('id').eq('escritura_id', escritura.id).single();
            if (operacion) {
                await supabase.from('participantes_operacion').insert([{
                    operacion_id: operacion.id,
                    persona_id: dni,
                    rol: c.rol?.toUpperCase() || 'VENDEDOR'
                }]);
            }
        }
    }

    return { folderId };
}

export async function GET() { return NextResponse.json({ status: "alive" }); }
