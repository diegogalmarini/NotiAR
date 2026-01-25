// --- SERVER-SIDE BROWSER POLYFILLS (IMMEDIATE FORCE) ---
if (typeof globalThis !== 'undefined') {
    const g = globalThis as any;
    if (!g.window) Object.defineProperty(g, 'window', { value: g, writable: true, configurable: true });
    if (!g.location) {
        Object.defineProperty(g, 'location', {
            value: { protocol: 'https:', host: 'localhost', href: 'https://localhost/' },
            writable: true,
            configurable: true
        });
    }
    if (g.window && !g.window.location) g.window.location = g.location;
    if (!g.atob) g.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
    if (!g.btoa) g.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
    console.log("[ROUTE] Aggressive Polyfills applied.");
}

import { NextResponse, after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { normalizeID, toTitleCase } from '@/lib/utils/normalization';
import { SkillExecutor } from '@/lib/agent/SkillExecutor';
import { classifyDocument } from '@/lib/skills/routing/documentClassifier';

export const maxDuration = 300;

// --- HELPERS ---

function safeParseInt(val: any): number | null {
    if (val === null || val === undefined) return null;
    const p = parseInt(String(val));
    return isNaN(p) ? null : p;
}

function safeParseDate(val: any): string | null {
    if (!val) return null;
    try {
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d.toISOString();
    } catch (e) {
        return null;
    }
}

/**
 * Main POST handler for document ingestion.
 */
export async function POST(req: Request) {
    try {
        console.log("🚀 STARTING INGESTION PIPELINE...");

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No se encontró el archivo en la solicitud." }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // 1. Initial creation for status tracking
        console.log(`[PIPELINE] Creating folder for: ${file.name}`);
        const { data: carpeta, error: folderError } = await supabaseAdmin.from('carpetas').insert({
            caratula: file.name.substring(0, 100),
            ingesta_estado: 'PROCESANDO',
            ingesta_paso: 'Iniciando análisis'
        }).select().single();

        if (folderError) throw new Error(`Error creando carpeta: ${folderError.message}`);

        // --- FLASH FORCED: TODO a background para respuesta inmediata ---
        const isLarge = file.size > 0; // 0KB = TODO dispara PROCESSING instantáneo

        if (isLarge) {
            console.log(`[PIPELINE] Hybrid branch: Large file detected. Launching background task...`);

            after(async () => {
                try {
                    await processInBackground(file, buffer, carpeta.id);
                    revalidatePath('/carpetas');
                } catch (e) {
                    console.error("[BACKGROUND] Fatal error:", e);
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
        console.log("[PIPELINE] Running extraction step...");
        let extractedText = "";
        try {
            // Simplified for the audit as we are using Vision/Skills mostly
            extractedText = "[OCR Placeholder for Audit Path]";
        } catch (e) { }

        const classification = await classifyDocument(file, extractedText);
        const docType = classification?.document_type || 'ESCRITURA';
        console.log(`[PIPELINE] Document Classified as: ${docType}`);

        const aiData = await runExtractionPipeline(docType, file, extractedText);
        const result = await persistIngestedData(aiData, file, buffer, carpeta.id);

        revalidatePath('/carpetas');
        revalidatePath('/dashboard');

        return NextResponse.json({
            success: result.success,
            status: result.success ? 'COMPLETED' : 'PARTIAL_ERROR',
            folderId: result.folderId,
            extractedData: aiData,
            error: result.error,
            db_logs: result.db_logs,
            debug: {
                clients: aiData.clientes?.length || 0,
                assets: aiData.inmuebles?.length || 0,
                persistedClients: result.persistedClients || 0,
                persistenceError: result.error
            }
        });

    } catch (error: any) {
        console.error("🔥 FULL INGESTION ERROR:", error);
        return NextResponse.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
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
            const normEntities = normalizeAIData(entities);

            // Financial calculations (optional for some documents but part of the standard flow)
            try {
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
            } catch (e) {
                console.warn("[PIPELINE] Secondary tools failed (Taxes/UIF):", e);
                aiData = normEntities;
            }
            break;
        default:
            const raw = await SkillExecutor.execute('notary-entity-extractor', file, { text: extractedText });
            aiData = normalizeAIData(raw);
    }
    return aiData;
}

async function processInBackground(file: File, buffer: Buffer, folderId: string) {
    console.log(`[BACKGROUND] ⚡ FLASH PROCESSING START: ${folderId} | File: ${file.name} | Size: ${file.size}`);
    try {
        console.log(`[BACKGROUND][${folderId}] Step 1: Classifying document...`);
        const classification = await classifyDocument(file, "");
        const docType = classification?.document_type || 'ESCRITURA';
        console.log(`[BACKGROUND][${folderId}] Step 2: Classified as ${docType}, running extraction...`);
        const aiData = await runExtractionPipeline(docType, file, "");
        console.log(`[BACKGROUND][${folderId}] Step 3: Extraction complete. Entities: ${aiData?.entidades?.length || aiData?.clientes?.length || 0}`);
        const result = await persistIngestedData(aiData, file, buffer, folderId);
        console.log(`[BACKGROUND][${folderId}] Step 4: Persistence complete. Success: ${result.success}`);

        if (result.success) {
            await supabaseAdmin.from('carpetas').update({
                ingesta_estado: 'COMPLETADO',
                ingesta_paso: 'Ingesta completada',
                resumen_ia: `IA: Detección finalizada. Persistidos: ${result.persistedClients || 0} personas y ${aiData.inmuebles?.length || 0} inmuebles.`
            }).eq('id', folderId);
        } else {
            await supabaseAdmin.from('carpetas').update({
                ingesta_estado: 'ERROR',
                ingesta_paso: `Error en persistencia: ${result.error || 'Ver logs'}`
            }).eq('id', folderId);
        }
    } catch (error: any) {
        console.error(`[BACKGROUND][${folderId}] ❌ FATAL ERROR:`, {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        await supabaseAdmin.from('carpetas').update({
            ingesta_estado: 'ERROR',
            ingesta_paso: `Error Flash: ${error.message}`
        }).eq('id', folderId);
    }
}

function normalizeAIData(raw: any) {
    if (!raw) return {};
    const ops = raw.detalles_operacion || {};
    const normalized: any = {
        clientes: [],
        inmuebles: [],
        resumen_acto: ops.tipo_acto?.valor || raw.resumen_acto?.valor || 'Ingesta',
        numero_escritura: ops.numero_escritura?.valor || raw.numero_escritura?.valor || null,
        fecha_escritura: ops.fecha_escritura?.valor || raw.fecha_escritura?.valor || null,
        operation_details: {
            price: ops.precio?.valor || raw.price?.valor || 0,
            currency: ops.precio?.moneda || raw.currency?.valor || 'USD',
            date: ops.fecha_escritura?.valor || raw.fecha_escritura?.valor
        }
    };
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

async function persistIngestedData(aiData: any, file: File, buffer: Buffer, existingFolderId: string) {
    console.log(`[PERSIST] Persisting data for folder ${existingFolderId}...`);
    const { clientes = [], inmuebles = [], resumen_acto, operation_details, numero_escritura } = aiData;
    const fileName = `${Date.now()}_${file.name}`;

    try {
        await supabaseAdmin.storage.from('escrituras_raw').upload(fileName, buffer, { contentType: file.type });
    } catch (e) {
        console.warn("[PERSIST] Storage upload failed:", e);
    }

    const folderId = existingFolderId;
    let assetId = null;

    if (inmuebles.length > 0) {
        const primary = inmuebles[0];
        const { data: asset } = await supabaseAdmin.from('inmuebles').insert({
            partido_id: primary.partido,
            nro_partida: primary.partida_inmobiliaria,
            nomenclatura: primary.nomenclatura,
            transcripcion_literal: primary.transcripcion_literal,
            valuacion_fiscal: primary.valuacion_fiscal
        }).select().single();
        assetId = asset?.id;
    }

    const { data: escritura } = await supabaseAdmin.from('escrituras').insert({
        carpeta_id: folderId,
        inmueble_id: assetId,
        resumen_ia: resumen_acto,
        storage_path: fileName,
        fecha_proceso: new Date().toISOString()
    }).select().single();

    if (!escritura) throw new Error("No se pudo crear el registro de escritura.");

    const { data: operacion, error: opError } = await supabaseAdmin.from('operaciones').insert([{
        escritura_id: escritura.id,
        tipo_acto: String(resumen_acto || 'COMPRAVENTA').toUpperCase().substring(0, 100),
        monto_operacion: parseFloat(String(operation_details?.price || 0)) || 0,
        nro_acto: numero_escritura ? String(numero_escritura) : null
    }]).select().single();

    let persistedClients = 0;
    const db_logs: string[] = [];
    if (opError) db_logs.push(`Op Error: ${opError.message}`);

    for (const c of clientes) {
        const dni = normalizeID(c.dni);
        if (!dni) continue;
        const { error: pError } = await supabaseAdmin.from('personas').upsert({
            dni,
            nombre_completo: toTitleCase(c.nombre_completo),
            cuit: normalizeID(c.cuit),
            nacionalidad: c.nacionalidad ? toTitleCase(c.nacionalidad) : null,
            fecha_nacimiento: safeParseDate(c.fecha_nacimiento),
            domicilio_real: c.domicilio_real ? { literal: c.domicilio_real } : null,
            estado_civil_detalle: c.estado_civil || null,
            origen_dato: 'IA_OCR',
            updated_at: new Date().toISOString()
        }, { onConflict: 'dni' });

        if (pError) db_logs.push(`Person Error (${dni}): ${pError.message}`);
        else {
            persistedClients++;
            if (operacion) {
                await supabaseAdmin.from('participantes_operacion').insert([{
                    operacion_id: operacion.id,
                    persona_id: dni,
                    rol: String(c.rol || 'VENDEDOR').toUpperCase().substring(0, 50)
                }]);
            }
        }
    }
    return { folderId, success: true, persistedClients, db_logs, error: null };
}

export async function GET() { return NextResponse.json({ status: "alive" }); }
