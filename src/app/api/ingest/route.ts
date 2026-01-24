import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { normalizeID, toTitleCase } from '@/lib/utils/normalization';
import * as Sentry from "@sentry/nextjs";
import { SkillExecutor, FileData } from '@/lib/agent/SkillExecutor';
import { classifyDocument, DocumentType } from '@/lib/skills/routing/documentClassifier';

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
        const fileData: FileData = { buffer, mimeType: file.type || 'application/pdf' };

        // 1. OCR (Optional fallback context)
        let extractedText = "";
        try {
            extractedText = await extractTextFromFile(file);
        } catch (e) { }

        // 2. Classify (The "Front Desk")
        const classification = await classifyDocument(fileData, extractedText);
        console.log(`[PIPELINE] Document Classified as: ${classification.document_type} (${classification.confidence})`);

        // 3. Dynamic Routing Handler
        let aiData: any = null;
        const docType = classification.document_type;

        switch (docType) {
            case 'DNI':
            case 'PASAPORTE':
                console.log("[PIPELINE] Executing Identity Workflow...");
                aiData = await SkillExecutor.execute('notary-identity-vision', { extractedText }, fileData);
                break;

            case 'ESCRITURA':
            case 'BOLETO_COMPRAVENTA':
                console.log("[PIPELINE] Executing Deed Workflow...");
                // Multi-step internal pipeline
                const rawEntities = await SkillExecutor.execute('notary-entity-extractor', { text: extractedText }, fileData);
                const entities = rawEntities || { clientes: [], inmuebles: [], operation_details: {} };

                // Deterministic calculation
                const taxes = await SkillExecutor.execute('notary-tax-calculator', {
                    price: entities.operation_details?.price || 0,
                    currency: entities.operation_details?.currency || 'USD',
                    exchangeRate: 1150,
                    acquisitionDate: entities.operation_details?.acquisition_date || '2010-01-01',
                    isUniqueHome: true,
                    fiscalValuation: entities.inmuebles?.[0]?.valuacion_fiscal || 0
                });
                // Semantic compliance
                const compliance = await SkillExecutor.execute('notary-uif-compliance', {
                    price: entities.operation_details?.price || 0,
                    moneda: entities.operation_details?.currency || 'USD',
                    parties: entities.clientes?.map((c: any) => ({ name: c.nombre_completo, is_pep: false })) || []
                });

                // Step D: Automated Drafting (Phase 4)
                console.log("[PIPELINE] Executing Drafting Workflow...");
                const draft = await SkillExecutor.execute('notary-deed-drafter', {
                    numero_escritura: entities.numero_escritura || "PROVISIONAL",
                    acto_titulo: entities.resumen_acto || "Compraventa",
                    fecha: entities.fecha_escritura || new Date().toISOString().split('T')[0],
                    escribano: entities.notario_interviniente || "Escribanía Galmarini",
                    registro: entities.registro_notario || "SETENTA",
                    clientes: entities.clientes,
                    inmuebles: entities.inmuebles,
                    tax_calculation: taxes,
                    compliance
                });

                aiData = { ...entities, tax_calculation: taxes, compliance, deed_draft: draft };
                console.log("[PIPELINE] Consolidated AI Data:", JSON.stringify(aiData, null, 2));
                break;

            case 'CERTIFICADO_RPI':
                console.log("[PIPELINE] Executing Certificate Workflow...");
                aiData = await SkillExecutor.execute('notary-rpi-reader', { text: extractedText }, fileData);
                break;

            default:
                console.warn("[PIPELINE] Unknown document type, falling back to generic extraction.");
                // Fallback to legacy-like extraction or generic semantic search
                aiData = await SkillExecutor.execute('notary-entity-extractor', { text: extractedText }, fileData);
        }

        // 4. Persistence logic (Mapping back to legacy DB schemas for compatibility)
        const result = await persistIngestedData(aiData, file, buffer);

        revalidatePath('/carpetas');
        revalidatePath('/dashboard');

        return NextResponse.json({
            success: true,
            classification,
            folderId: result.folderId,
            extractedData: aiData
        });

    } catch (error: any) {
        console.error('Fatal Error Ingesting:', error);
        Sentry.captureException(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * Persists the result of any skill into the Supabase database.
 * Maintain legacy support for carpetas / escrituras / personas.
 */
async function persistIngestedData(data: any, file: File, buffer: Buffer) {
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

    // 1. Create Carpeta
    const { data: carpeta, error: cError } = await supabase
        .from('carpetas')
        .insert([{
            caratula: `${docType}: ${file.name}`,
            estado: 'ABIERTA',
            resumen_ia: `Ingesta automática de ${docType} (${classification.confidence}/10)`
        }])
        .select()
        .single();
    if (cError) throw cError;

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
        carpeta_id: carpeta.id,
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

    return { folderId: carpeta.id };
}

export async function GET() { return NextResponse.json({ status: "alive" }); }
