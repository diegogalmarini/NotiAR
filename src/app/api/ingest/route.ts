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

function safeParseInt(val: any): number | null {
    if (val === null || val === undefined) return null;
    const parsed = parseInt(String(val).replace(/[^0-9]/g, ''), 10);
    return isNaN(parsed) ? null : parsed;
}

function safeParseDate(val: any): string | null {
    if (!val) return null;
    try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().split('T')[0]; // YYYY-MM-DD
    } catch { return null; }
}

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
        // Lowered threshold to 1MB to ensure most PDFs go through the async pipeline
        const isLarge = file.size > 1 * 1024 * 1024;

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
            success: result.success,
            status: result.success ? 'COMPLETED' : 'PARTIAL_ERROR',
            folderId: result.folderId,
            extractedData: aiData,
            error: result.error,
            debug: {
                clients: aiData.clientes?.length || 0,
                assets: aiData.inmuebles?.length || 0,
                persistedClients: result.persistedClients || 0,
                persistenceError: result.error
            }
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
/**
 * normalizeAIData: Bridges the gap between complex Schema and flat Persistence.
 */
function normalizeAIData(raw: any) {
    if (!raw) return {};

    const ops = raw.detalles_operacion || {};
    const normalized: any = {
        clientes: [],
        inmuebles: [],
        resumen_acto: ops.tipo_acto?.valor || raw.resumen_acto?.valor || 'Ingesta',
        numero_escritura: ops.numero_escritura?.valor || raw.numero_escritura?.valor || null,
        fecha_escritura: ops.fecha_escritura?.valor || raw.fecha_escritura?.valor || null,
        notario_interviniente: ops.notario_interviniente?.valor || raw.notario_interviniente?.valor || null,
        registro_notario: ops.registro_notario?.valor || raw.registro_notario?.valor || null,
        operation_details: {
            price: ops.precio?.valor || raw.price?.valor || 0,
            currency: ops.precio?.moneda || raw.currency?.valor || 'USD',
            date: ops.fecha_escritura?.valor || raw.fecha_escritura?.valor
        }
    };

    // Map People (entidades)
    if (raw.entidades && Array.isArray(raw.entidades)) {
        normalized.clientes = raw.entidades.map((e: any) => {
            const d = e.datos || {};
            return {
                rol: e.rol || 'VENDEDOR',
                nombre_completo: d.nombre_completo?.valor || 'Desconocido',
                dni: d.dni_cuil_cuit?.valor || null,
                cuit: d.dni_cuil_cuit?.valor || null,
                estado_civil: d.estado_civil?.valor || null,
                nacionalidad: d.nacionalidad?.valor || null,
                domicilio_real: d.domicilio?.valor || null,
                fecha_nacimiento: null
            };
        });
    }

    // Map Properties (inmuebles)
    if (raw.inmuebles && Array.isArray(raw.inmuebles)) {
        normalized.inmuebles = raw.inmuebles.map((i: any) => ({
            partido: i.partido?.valor || 'BAHIA BLANCA',
            partida_inmobiliaria: i.partida_inmobiliaria?.valor,
            nomenclatura: i.nomenclatura?.valor,
            transcripcion_literal: i.transcripcion_literal?.valor,
            valuacion_fiscal: i.valuacion_fiscal?.valor || 0
        }));
    }

    return normalized;
}

async function runExtractionPipeline(docType: string, file: File, extractedText: string) {
    let aiData: any = null;

    switch (docType) {
        case 'DNI':
        case 'PASAPORTE':
            aiData = await SkillExecutor.execute('notary-identity-vision', file, { extractedText });
            break;

        case 'ESCRITURA':
        case 'BOLETO_COMPRAVENTA':
            const entities = await SkillExecutor.execute('notary-entity-extractor', file, { text: extractedText });

            // Financial & Compliance Tools
            // Use normalized values for secondary tools
            const normEntities = normalizeAIData(entities);
            const taxes = await SkillExecutor.execute('notary-tax-calculator', undefined, {
                price: normEntities.operation_details?.price || 0,
                currency: normEntities.operation_details?.currency || 'USD'
            });
            const compliance = await SkillExecutor.execute('notary-uif-compliance', undefined, {
                price: normEntities.operation_details?.price || 0,
                moneda: normEntities.operation_details?.currency || 'USD',
                parties: normEntities.clientes || []
            });

            aiData = { ...normEntities, tax_calculation: taxes, compliance };
            break;

        default:
            const raw = await SkillExecutor.execute('notary-entity-extractor', file, { text: extractedText });
            aiData = normalizeAIData(raw);
    }
    return aiData;
}

/**
 * processInBackground: Simulated background worker for Vercel.
 * Reports progress using ingesta_paso and ingesta_estado.
 */
async function processInBackground(file: File, buffer: Buffer, folderId: string) {
    console.log(`[BACKGROUND] 🚀 Starting processing for folder ${folderId}...`);

    try {
        await supabaseAdmin.from('carpetas').update({
            ingesta_estado: 'PROCESANDO',
            ingesta_paso: 'Mapeando documento (OCR + Visión)...'
        }).eq('id', folderId);

        let extractedText = "";
        try {
            extractedText = await extractTextFromFile(file);
        } catch (e) {
            console.warn("[BACKGROUND] OCR extraction failed, continuing with vision only.");
        }

        // 2. Step: Classification
        await supabaseAdmin.from('carpetas').update({
            ingesta_paso: 'Identificando tipo de instrumento (Clasificación)...'
        }).eq('id', folderId);

        const classification = await classifyDocument(file, extractedText);

        // 3. Step: Extraction
        await supabaseAdmin.from('carpetas').update({
            ingesta_paso: `Ejecutando Pipeline Híbrido: ${classification.document_type}...`
        }).eq('id', folderId);

        const aiData = await runExtractionPipeline(classification.document_type, file, extractedText);

        console.log(`[BACKGROUND] 🤖 AI Output received for ${folderId}:`, JSON.stringify(aiData, null, 2));

        if (!aiData.clientes || aiData.clientes.length === 0) {
            console.warn(`[BACKGROUND] ⚠️ No entities recognized for ${folderId}`);
        }

        // 4. Persistence
        await supabaseAdmin.from('carpetas').update({
            ingesta_paso: 'Persistiendo datos jurídicos y vinculando partes...'
        }).eq('id', folderId);

        const result = await persistIngestedData(aiData, file, buffer, folderId);

        // 5. Finalize
        if (result.success) {
            await supabaseAdmin.from('carpetas').update({
                ingesta_estado: 'COMPLETADO',
                ingesta_paso: 'Ingesta completada',
                resumen_ia: `IA: Detección finalizada. Persistidos: ${result.persistedClients || 0} personas y ${aiData.inmuebles?.length || 0} inmuebles.`
            }).eq('id', folderId);
        } else {
            await supabaseAdmin.from('carpetas').update({
                ingesta_estado: 'ERROR',
                ingesta_paso: `Error en persistencia: ${result.error || 'Error desconocido'}`
            }).eq('id', folderId);
        }

        console.log(`[BACKGROUND] Processing COMPLETED for folder ${folderId}`);
    } catch (e: any) {
        console.error(`[BACKGROUND] Fatal error processing ${folderId}:`, e);
        await supabaseAdmin.from('carpetas').update({
            ingesta_estado: 'ERROR',
            ingesta_paso: `Error crítico: ${e.message || 'Error desconocido'}`
        }).eq('id', folderId);
        Sentry.captureException(e);
    }
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
                resumen_ia: `Ingesta automática (${resumen_acto || 'Documento'})`,
                ingesta_estado: 'COMPLETADO',
                ingesta_paso: 'Ingesta completada'
            }])
            .select()
            .single();
        if (cError) throw cError;
        folderId = carpeta.id;
    } else {
        // Update placeholder with final summary
        const summary = `Procesamiento completado. Acto: ${resumen_acto}. [Detectados: ${clientes.length} partes, ${inmuebles.length} inmuebles]`;

        await supabaseAdmin.from('carpetas').update({
            caratula: `Carpeta: ${resumen_acto || file.name}`,
            resumen_ia: summary
        }).eq('id', folderId);
    }

    // 2. Process Inmuebles
    const propertyIds: string[] = [];
    console.log(`[PERSIST] Processing ${inmuebles.length} properties...`);
    for (const i of inmuebles) {
        const { data: inmueble, error: iError } = await supabaseAdmin.from('inmuebles').upsert({
            partido_id: i.partido || 'BAHIA BLANCA',
            nro_partida: i.partida_inmobiliaria || `TEMP_${Date.now()}`,
            nomenclatura: i.nomenclatura || null,
            transcripcion_literal: i.transcripcion_literal || null,
            valuacion_fiscal: i.valuacion_fiscal || 0,
        }, { onConflict: 'partido_id,nro_partida' }).select().single();

        if (iError) console.error(`[PERSIST] Property error:`, iError);
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

    // 4. Create Escritura
    console.log(`[PERSIST] Creating escritura for folder ${folderId}...`);
    const { data: escritura, error: eError } = await supabaseAdmin.from('escrituras').insert([{
        carpeta_id: folderId,
        nro_protocolo: safeParseInt(numero_escritura),
        fecha_escritura: safeParseDate(fecha_escritura) || safeParseDate(operation_details?.date),
        inmueble_princ_id: propertyIds[0] || null,
        notario_interviniente,
        registro: registro_notario,
        pdf_url: fileUrl,
        analysis_metadata: {
            tax_calculation: data.tax_calculation,
            compliance: data.compliance,
            raw_ai_data: data
        }
    }]).select().single();

    if (eError) {
        console.error(`[PERSIST] Escritura error:`, eError);
        return { folderId, success: false, error: eError.message };
    }

    // 4b. Create Operacion record
    console.log(`[PERSIST] Creating operation record for escritura ${escritura.id}...`);
    const { data: operacion, error: opError } = await supabaseAdmin.from('operaciones').insert([{
        escritura_id: escritura.id,
        tipo_acto: String(resumen_acto || 'COMPRAVENTA').toUpperCase().substring(0, 100),
        monto: parseFloat(String(operation_details?.price || 0)) || 0,
        moneda: String(operation_details?.currency || 'USD').substring(0, 5)
    }]).select().single();

    if (opError) console.error(`[PERSIST] Operation error:`, opError);

    // 5. Process Personas
    let persistedClients = 0;
    console.log(`[PERSIST] Processing ${clientes.length} clients...`);
    for (const c of clientes) {
        const dni = normalizeID(c.dni);
        if (!dni) {
            console.warn(`[PERSIST] Skipping client without DNI:`, c.nombre_completo);
            continue;
        }

        const { error: pError } = await supabaseAdmin.from('personas').upsert({
            dni,
            nombre_completo: toTitleCase(c.nombre_completo),
            cuit: normalizeID(c.cuit),
            nacionalidad: c.nacionalidad ? toTitleCase(c.nacionalidad) : null,
            fecha_nacimiento: safeParseDate(c.fecha_nacimiento),
            domicilio_real: c.domicilio_real ? { literal: c.domicilio_real } : null,
            estado_civil_detalle: c.estado_civil || null,
            origen_dato: 'IA_ORCHESTRATOR',
            updated_at: new Date().toISOString()
        }, { onConflict: 'dni' });

        if (pError) {
            console.error(`[PERSIST] Person error (${dni}):`, pError);
        } else {
            persistedClients++;
        }

        if (escritura && operacion) {
            const { error: linkError } = await supabaseAdmin.from('participantes_operacion').insert([{
                operacion_id: operacion.id,
                persona_id: dni,
                rol: String(c.rol || 'VENDEDOR').toUpperCase().substring(0, 50)
            }]);
            if (linkError) console.error(`[PERSIST] Link error:`, linkError);
        }
    }

    return { folderId, success: true, persistedClients };
}

export async function GET() { return NextResponse.json({ status: "alive" }); }
