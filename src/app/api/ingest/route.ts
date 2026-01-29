// --- SERVER-SIDE BROWSER POLYFILLS (SAFE) ---
if (typeof globalThis !== 'undefined') {
    const g = globalThis as any;
    if (!g.window) g.window = g;
    if (!g.self) g.self = g;

    // Polyfill character encoding
    if (!g.atob) g.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
    if (!g.btoa) g.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');

    // Ensure navigator exists minimally
    if (!g.navigator) g.navigator = { userAgent: 'Node.js/NotiAR' };
}
// Flash v1.2.17 - SCHEMA FIX: Separated DNI/CUIT + Biographical Fields
import { NextResponse, after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { normalizeID, toTitleCase, formatCUIT } from '@/lib/utils/normalization';
import { SkillExecutor } from '@/lib/agent/SkillExecutor';
import { classifyDocument } from '@/lib/skills/routing/documentClassifier';

export const maxDuration = 300;

// --- HELPERS ---

function extractString(val: any, joinWithComma: boolean = true): string | null {
    if (val === null || val === undefined) return null;
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.toLowerCase() === 'null') return null;
        return trimmed;
    }
    if (typeof val === 'number') return String(val);
    if (val.valor) {
        const v = String(val.valor).trim();
        if (v.toLowerCase() === 'null') return null;
        return v;
    }
    if (val.razon_social) return extractString(val.razon_social);
    if (val.nombre) return extractString(val.nombre);
    if (val.apellidos || val.nombres) {
        const a = extractString(val.apellidos) || "";
        const n = extractString(val.nombres) || "";
        if (a && n) return joinWithComma ? `${a}, ${n}` : `${n} ${a}`.trim();
        return (a || n || null);
    }
    return null;
}

function safeParseInt(val: any): number | null {
    if (val === null || val === undefined) return null;
    const str = String(val).trim().toUpperCase();
    const p = parseInt(str);
    if (!isNaN(p)) return p;

    // Spanish text to number mapping (basic)
    const textNumbers: Record<string, number> = {
        "UNO": 1, "DOS": 2, "TRES": 3, "CUATRO": 4, "CINCO": 5, "SEIS": 6, "SIETE": 7, "OCHO": 8, "NUEVE": 9, "DIEZ": 10,
        "ONCE": 11, "DOCE": 12, "TRECE": 13, "CATORCE": 14, "QUINCE": 15, "DIECISEIS": 16, "DIECISIETE": 17, "DIECIOCHO": 18, "DIECINUEVE": 19, "VEINTE": 20,
        "VEINTIUNO": 21, "VEINTIDOS": 22, "VEINTITRES": 23, "VEINTICUATRO": 24, "VEINTICINCO": 25, "VEINTISEIS": 26, "VEINTISIETE": 27, "VEINTIOCHO": 28, "VEINTINUEVE": 29, "TREINTA": 30,
        "CUARENTA": 40, "CINCUENTA": 50, "SESENTA": 60, "SETENTA": 70, "OCHENTA": 80, "NOVENTA": 90, "CIEN": 100
    };

    if (textNumbers[str]) return textNumbers[str];

    // Simple compound handling (e.g., "VEINTI CUATRO" or "SETENTA Y DOS")
    const parts = str.split(/[\s-yY]+/).filter(Boolean);
    if (parts.length > 1) {
        let total = 0;
        for (const part of parts) {
            if (textNumbers[part]) total += textNumbers[part];
        }
        return total > 0 ? total : null;
    }

    return null;
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

        // --- HYBRID PROCESSING: SYNC for Small, ASYNC for Large ---
        const isLarge = file.size > 500 * 1024; // 500KB threshold

        if (isLarge) {
            console.log(`[PIPELINE] 📦 LARGE FILE detected (${file.size} bytes). Routing to BACKGROUND.`);

            // Return immediate response to the client
            after(async () => {
                try {
                    console.log(`[BACKGROUND] Starting extraction for: ${file.name}`);
                    const extractedText = "[OCR Placeholder for Audit Path]"; // TODO: Implement real OCR if needed
                    const classification = await classifyDocument(file, extractedText);
                    const docType = classification?.document_type || 'ESCRITURA';

                    const aiData = await runExtractionPipeline(docType, file, extractedText);
                    const result = await persistIngestedData(aiData, file, buffer, carpeta.id);

                    await supabaseAdmin.from('carpetas').update({
                        ingesta_estado: result.success ? 'COMPLETADO' : 'ERROR',
                        ingesta_paso: result.success
                            ? `IA: ${result.persistedClients || 0} personas, ${aiData.inmuebles?.length || 0} inmuebles`
                            : `Error: ${result.error || 'Ver logs'}`,
                        resumen_ia: result.success ? `${aiData.resumen_acto || 'Extracción Background'}` : null
                    }).eq('id', carpeta.id);

                    revalidatePath('/carpetas');
                    revalidatePath('/dashboard');
                } catch (bgError: any) {
                    console.error("🔥 BACKGROUND PIPELINE FATAL:", bgError);
                    await supabaseAdmin.from('carpetas').update({
                        ingesta_estado: 'ERROR',
                        ingesta_paso: `Fatal: ${bgError.message}`
                    }).eq('id', carpeta.id);
                }
            });

            return NextResponse.json({
                success: true,
                status: 'PROCESSING_BACKGROUND',
                folderId: carpeta.id,
                message: "Archivo grande detectado. Procesando en segundo plano."
            });
        }

        // --- FLASH SYNC PROCESSING (Small files) ---
        console.log(`[PIPELINE] ⚡ FLASH SYNC PROCESSING: ${file.name} (${file.size} bytes)`);

        let extractedText = "[OCR Placeholder for Audit Path]";
        const classification = await classifyDocument(file, extractedText);
        const docType = classification?.document_type || 'ESCRITURA';

        const aiData = await runExtractionPipeline(docType, file, extractedText);
        const result = await persistIngestedData(aiData, file, buffer, carpeta.id);

        await supabaseAdmin.from('carpetas').update({
            ingesta_estado: result.success ? 'COMPLETADO' : 'ERROR',
            ingesta_paso: result.success
                ? `IA: ${result.persistedClients || 0} personas, ${aiData.inmuebles?.length || 0} inmuebles`
                : `Error: ${result.error || 'Ver logs'}`,
            resumen_ia: result.success ? `${aiData.resumen_acto || 'Extracción Flash'}` : null
        }).eq('id', carpeta.id);

        revalidatePath('/carpetas');
        revalidatePath('/dashboard');

        return NextResponse.json({
            success: result.success,
            status: result.success ? 'COMPLETED' : 'PARTIAL_ERROR',
            folderId: result.folderId,
            extractedData: aiData,
            debug: {
                clients: aiData.clientes?.length || 0,
                persistedClients: result.persistedClients || 0,
                assets: aiData.inmuebles?.length || 0
            }
        });

        // ✅ Invalidate cache so new folder appears immediately
        revalidatePath('/dashboard');
        revalidatePath('/carpetas');

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
        case 'HIPOTECA':
        case 'PRESTAMO':
            const entities = await SkillExecutor.execute('notary-entity-extractor', file, { text: extractedText });
            const normEntities = normalizeAIData(entities);

            // Special handling for Mortgages
            let mortgageDetails = null;
            if (docType === 'HIPOTECA' || docType === 'PRESTAMO') {
                mortgageDetails = await SkillExecutor.execute('notary-mortgage-reader', file, { extractedText });
            }

            // Financial calculations (optional for some documents but part of the standard flow)
            try {
                const isUva = mortgageDetails?.financial_terms?.capital?.currency === 'UVA';
                const uvaRate = mortgageDetails?.financial_terms?.uva_quoted?.valor || 1;

                const taxes = await SkillExecutor.execute('notary-tax-calculator', undefined, {
                    price: isUva ? mortgageDetails?.financial_terms?.capital?.valor : (normEntities.operation_details?.price || 0),
                    currency: isUva ? 'UVA' : (normEntities.operation_details?.currency || 'USD'),
                    exchangeRate: isUva ? uvaRate : 1 // Logic will handle USD conversion separately if needed, for UVA we pass the rate here
                });

                const compliance = await SkillExecutor.execute('notary-uif-compliance', undefined, {
                    price: normEntities.operation_details?.price || 0,
                    moneda: normEntities.operation_details?.currency || 'USD',
                    parties: normEntities.clientes || []
                });
                aiData = { ...normEntities, mortgage: mortgageDetails, tax_calculation: taxes, compliance };
            } catch (e) {
                console.warn("[PIPELINE] Secondary tools failed (Taxes/UIF/Mortgage):", e);
                aiData = { ...normEntities, mortgage: mortgageDetails };
            }
            break;
        default:
            const raw = await SkillExecutor.execute('notary-entity-extractor', file, { text: extractedText });
            aiData = normalizeAIData(raw);
    }
    return aiData;
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
        notario: ops.escribano_nombre?.valor || null,
        registro: ops.registro_numero?.valor || null,
        operation_details: {
            price: raw.cesion_beneficiario?.precio_cesion?.monto || raw.precio_cesion?.monto || ops.precio?.valor || raw.price?.valor || 0,
            currency: raw.cesion_beneficiario?.precio_cesion?.moneda || raw.precio_cesion?.moneda || ops.precio?.moneda || raw.currency?.valor || 'USD',
            date: ops.fecha_escritura?.valor || raw.fecha_escritura?.valor,
            // Dual pricing for fiduciary operations
            precio_construccion: raw.precio_construccion?.monto || null,
            precio_cesion: raw.cesion_beneficiario?.precio_cesion?.monto || raw.precio_cesion?.monto || null,
            tipo_cambio_cesion: raw.cesion_beneficiario?.precio_cesion?.tipo_cambio || raw.precio_cesion?.tipo_cambio || null,
            equivalente_ars_cesion: raw.cesion_beneficiario?.precio_cesion?.equivalente_ars || raw.precio_cesion?.equivalente_ars || null
        },
        // Beneficiary assignment (fiduciary operations)
        cesion_beneficiario: (raw.cesion_beneficiario || raw.cesion || raw.transferencia) ? (() => {
            const src = raw.cesion_beneficiario || raw.cesion || raw.transferencia;
            return {
                cedente_nombre: src.cedente?.nombre || src.cedente || null,
                cedente_fecha_incorporacion: src.cedente?.fecha_incorporacion || null,
                cesionario_nombre: src.cesionario?.nombre || src.cesionario || null,
                cesionario_dni: src.cesionario?.dni || null,
                precio_cesion: (src.precio_cesion?.monto || src.precio?.monto || null),
                moneda_cesion: (src.precio_cesion?.moneda || src.precio?.moneda || null),
                fecha_cesion: src.fecha_cesion || src.fecha || null
            };
        })() : null
    };
    if (raw.entidades && Array.isArray(raw.entidades)) {
        const allClients: any[] = [];
        raw.entidades.forEach((e: any) => {
            const d = e.datos || {};
            const rawCuit = d.cuit_cuil?.valor?.toString()?.replace(/\D/g, '') || '';

            // Detect FIDEICOMISO as separate entity type
            const isFideicomiso = e.tipo_entidad === 'FIDEICOMISO' ||
                (d.nombre_completo?.toString() || d.razon_social?.toString() || d.nombre?.toString() || '').toUpperCase().includes('FIDEICOMISO');

            const forcedTipoPersona = isFideicomiso
                ? 'FIDEICOMISO'
                : (e.tipo_persona === 'JURIDICA' || ['30', '33', '34'].some(p => rawCuit.startsWith(p)))
                    ? 'JURIDICA'
                    : (e.tipo_persona || 'FISICA');

            const isEntity = forcedTipoPersona === 'JURIDICA' || forcedTipoPersona === 'FIDEICOMISO';

            // CLEANING: If it's a Fideicomiso, remove the "administrado por..." or "fiduciaria..." part from the name if concatenated
            let rawNombre = isEntity
                ? (extractString(d.nombre_completo, false) || extractString(d.razon_social, false) || extractString(d.nombre, false) || 'Desconocido')
                : (extractString(d.nombre_completo) || 'Desconocido');

            if (isFideicomiso) {
                // Remove everything after S.A., SRL, or specific trustee indicators to avoid combined cards
                // Handle both: "Trust (Trustee)" and "Trustee (Trust)"
                const trusteeIndicators = ['S.A.', 'SRL', 'S.A ', 'SOCIEDAD ANONIMA', 'ADMINISTRADO POR', 'FIDUCIARIA'];
                const upperNombre = rawNombre.toUpperCase();

                // Case 1: "Trustee (FIDEICOMISO ...)"
                if (upperNombre.includes('(') && upperNombre.includes('FIDEICOMISO')) {
                    const parts = rawNombre.split(/[\(\)]+/).filter(p => p.trim().length > 3);
                    if (parts.length >= 2) {
                        const fideicomisoPart = parts.find(p => p.toUpperCase().includes('FIDEICOMISO')) || "";
                        const trusteePart = parts.find(p => !p.toUpperCase().includes('FIDEICOMISO')) || "";

                        if (fideicomisoPart && trusteePart) {
                            console.log(`[PIPELINE] Splitting combined entity by parenthesis: Trust="${fideicomisoPart}", Trustee="${trusteePart}"`);
                            rawNombre = fideicomisoPart.trim();

                            // Check if trustee exists
                            const trusteeExists = raw.entidades.some((ent: any) =>
                                (ent.datos?.nombre_completo || ent.datos?.razon_social || "").toString().toUpperCase().includes(trusteePart.toUpperCase())
                            );

                            if (!trusteeExists) {
                                allClients.push({
                                    rol: 'FIDUCIARIA',
                                    tipo_persona: 'JURIDICA',
                                    nombre_completo: trusteePart.trim(),
                                    cuit: formatCUIT(extractString(d.cuit_fiduciaria || raw.fideicomiso?.fiduciaria?.cuit)),
                                    cuit_tipo: 'CUIT',
                                    cuit_is_formal: true
                                });
                            }
                        }
                    }
                } else {
                    // Case 2: Concatenated text without parenthesis
                    for (const indicator of trusteeIndicators) {
                        const index = upperNombre.indexOf(indicator);
                        if (index !== -1) {
                            // Determine if trustee is at start or end
                            let trusteeName = "";
                            if (index < 15) { // Trustee at START: "Trustee S.A. Administrado por Fideicomiso..."
                                // This case is rarer in raw strings but happens
                                // For now, let's prioritize the most common pattern found in 103.pdf
                            } else { // Trustee at END: "Fideicomiso G-4 SOMAJOFA S.A."
                                trusteeName = rawNombre.substring(index).trim();
                                rawNombre = rawNombre.substring(0, index).trim();

                                if (rawNombre.toUpperCase().endsWith(' POR')) {
                                    rawNombre = rawNombre.substring(0, rawNombre.length - 4).trim();
                                }

                                const trusteeExists = raw.entidades.some((ent: any) =>
                                    (ent.datos?.nombre_completo || ent.datos?.razon_social || "").toString().toUpperCase().includes(trusteeName.toUpperCase())
                                );

                                if (!trusteeExists) {
                                    allClients.push({
                                        rol: 'FIDUCIARIA',
                                        tipo_persona: 'JURIDICA',
                                        nombre_completo: trusteeName,
                                        cuit: formatCUIT(extractString(d.cuit_fiduciaria || raw.fideicomiso?.fiduciaria?.cuit)),
                                        cuit_tipo: 'CUIT',
                                        cuit_is_formal: true
                                    });
                                }
                                break;
                            }
                        }
                    }
                }
            }

            // DEDUPLICATION: If this person is already listed in representatives, skip as separate card
            // unless they are also a principal party (complex case, but usually AI gets confused)
            const isDuplicateOfRep = raw.entidades.some((ent: any) =>
                ent.representacion?.representantes?.some((r: any) => normalizeID(String(r.dni || "")) === normalizeID(String(d.dni || "")))
            );
            if (isDuplicateOfRep && e.rol !== 'APODERADO/REPRESENTANTE') {
                console.log(`[PIPELINE] Skipping entity ${rawNombre} as it is already a representative.`);
                return;
            }

            const mainClient = {
                rol: extractString(e.rol) || 'VENDEDOR',
                tipo_persona: forcedTipoPersona,
                nombre_completo: rawNombre,
                dni: extractString(d.dni) || null,
                cuit: formatCUIT(extractString(d.cuit_cuil)),
                estado_civil: extractString(d.estado_civil) || null,
                nacionalidad: extractString(d.nacionalidad) || null,
                domicilio_real: (d.domicilio?.valor || d.domicilio) ? { literal: extractString(d.domicilio?.valor || d.domicilio) } : null,
                fecha_nacimiento: extractString(d.fecha_nacimiento) || null,
                nombres_padres: extractString(d.nombres_padres) || null,
                cuit_tipo: (() => {
                    if (forcedTipoPersona === 'JURIDICA') return 'CUIT';

                    // 1. Prioritize literal text in the CUIT field itself if available
                    // We check the whole object to capture "C.U.I.L." if it's in a .literal or .texto field
                    const cuitObjStr = JSON.stringify(d.cuit_cuil || "").toUpperCase();
                    if (cuitObjStr.includes("C.U.I.L.") || cuitObjStr.includes("CUIL")) return 'CUIL';
                    if (cuitObjStr.includes("C.U.I.T.") || cuitObjStr.includes("CUIT")) return 'CUIT';

                    // 2. Check if AI already classified it
                    if (e.cuit_tipo?.toUpperCase() === 'CUIL') return 'CUIL';
                    if (e.cuit_tipo?.toUpperCase() === 'CUIT') return 'CUIT';

                    // 3. Inference from local profession/profile
                    const prof = (d.profesion?.valor || "").toUpperCase();
                    if (prof.includes("EMPLEADO") || prof.includes("ESTUDIANTE") || prof.includes("JUBILADO")) return 'CUIL';
                    if (prof.includes("COMERCIANTE") || prof.includes("PROFESIONAL") || prof.includes("MONOTRIBUTISTA")) return 'CUIT';

                    // 4. Fallback to global text search
                    const rawText = (raw.full_text || "").toUpperCase();
                    if (rawText.includes("C.U.I.L.") || rawText.includes("CUIL")) return 'CUIL';

                    return 'CUIT'; // Default
                })(),
                cuit_is_formal: true, // Default for NotiAR
                datos_conyuge: d.conyuge ? {
                    nombre: extractString(d.conyuge.nombre_completo || d.conyuge.nombre) || null,
                    dni: extractString(d.conyuge.dni) || null,
                    cuit: extractString(d.conyuge.cuit_cuil) || null
                } : null
            };
            allClients.push(mainClient);

            // Flatten Representatives (e.g. Norman Giralde)
            if (e.representacion?.representantes && Array.isArray(e.representacion.representantes)) {
                e.representacion.representantes.forEach((rep: any) => {
                    const repNombre = extractString(rep.nombre) || 'Desconocido';
                    allClients.push({
                        rol: 'APODERADO/REPRESENTANTE',
                        caracter: `lo hace en nombre y representación de ${mainClient.nombre_completo}`,
                        tipo_persona: 'FISICA',
                        nombre_completo: repNombre,
                        dni: extractString(rep.dni) || null,
                        cuit: formatCUIT(extractString(rep.cuit_cuil)),
                        cuit_tipo: (() => {
                            const litStr = JSON.stringify(rep.cuit_cuil || "").toUpperCase();
                            if (litStr.includes("C.U.I.L.") || litStr.includes("CUIL")) return 'CUIL';
                            if (litStr.includes("C.U.I.T.") || litStr.includes("CUIT")) return 'CUIT';
                            return 'CUIL'; // Default for natural persons
                        })(),
                        cuit_is_formal: true,
                        nacionalidad: extractString(rep.nacionalidad) || null,
                        fecha_nacimiento: extractString(rep.fecha_nacimiento) || null,
                        domicilio_real: (rep.domicilio?.valor || rep.domicilio) ? { literal: extractString(rep.domicilio?.valor || rep.domicilio) } : null,
                        estado_civil: extractString(rep.estado_civil) || null
                    });
                });
            }
        });
        normalized.clientes = allClients;
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
    const fileName = `documents/${Date.now()}_${file.name}`;
    const db_logs: string[] = [];
    let persistedClients = 0;
    let publicUrl = null;
    const conflicts: { type: 'PERSONA' | 'INMUEBLE', id: string, existing: any, extracted: any }[] = [];

    try {
        const { error: uploadError } = await supabaseAdmin.storage.from('escrituras').upload(fileName, buffer, { contentType: file.type });
        if (!uploadError) {
            const { data } = supabaseAdmin.storage.from('escrituras').getPublicUrl(fileName);
            publicUrl = data.publicUrl;
        }
    } catch (e) {
        console.warn("[PERSIST] Storage upload failed:", e);
    }

    const folderId = existingFolderId;
    let assetId = null;

    if (inmuebles.length > 0) {
        const primary = inmuebles[0];
        // --- SMART CHECK: Inmueble ---
        const { data: existingAsset } = await supabaseAdmin
            .from('inmuebles')
            .select('*')
            .eq('partido_id', primary.partido)
            .eq('nro_partida', primary.partida_inmobiliaria)
            .maybeSingle();

        if (existingAsset) {
            // Compare critical fields
            const hasChanges =
                existingAsset.nomenclatura !== primary.nomenclatura ||
                existingAsset.transcripcion_literal !== primary.transcripcion_literal;

            if (hasChanges) {
                conflicts.push({
                    type: 'INMUEBLE',
                    id: `${primary.partido}-${primary.partida_inmobiliaria}`,
                    existing: existingAsset,
                    extracted: primary
                });
            }
            assetId = existingAsset.id;
        } else {
            const { data: asset, error: assetError } = await supabaseAdmin.from('inmuebles').insert({
                partido_id: primary.partido,
                nro_partida: primary.partida_inmobiliaria,
                nomenclatura: primary.nomenclatura,
                transcripcion_literal: primary.transcripcion_literal,
                valuacion_fiscal: primary.valuacion_fiscal
            }).select().single();

            if (assetError) {
                console.error('[PERSIST] Error creating inmueble:', assetError);
            } else {
                assetId = asset?.id;
            }
        }
    }

    // Build escritura object - FULL v1.1 usando nombres de columna reales
    const escrituraData: any = {
        carpeta_id: folderId,
        nro_protocolo: safeParseInt(aiData.numero_escritura),
        fecha_escritura: safeParseDate(aiData.fecha_escritura),
        registro: aiData.registro ? String(aiData.registro) : null,
        notario_interviniente: aiData.notario ? String(aiData.notario) : null,
        inmueble_princ_id: assetId, // Vinculando el inmueble principal
        pdf_url: publicUrl,
        analysis_metadata: JSON.parse(JSON.stringify(aiData)) // SANITIZACIÓN FORZADA
    };

    const { data: escritura, error: escrituraError } = await supabaseAdmin.from('escrituras').insert(escrituraData).select().single();

    if (escrituraError || !escritura) {
        console.error('[PERSIST] ❌ Error creating escritura:', escrituraError);
        return { success: false, error: `Error creando escritura: ${escrituraError?.message || 'Unknown'}` };
    }

    const { data: operacion, error: opError } = await supabaseAdmin.from('operaciones').insert([{
        escritura_id: escritura?.id || null, // Tolerante si escritura falló
        tipo_acto: String(resumen_acto || 'COMPRAVENTA').toUpperCase().substring(0, 100),
        monto_operacion: parseFloat(String(operation_details?.price || 0)) || 0,
        nro_acto: aiData.numero_escritura ? String(safeParseInt(aiData.numero_escritura) || aiData.numero_escritura) : null,
        // Dual pricing for fiduciary operations
        precio_construccion: operation_details?.precio_construccion || null,
        precio_cesion: operation_details?.precio_cesion || null,
        moneda_cesion: operation_details?.currency?.includes('USD') ? 'USD' : 'ARS',
        tipo_cambio_cesion: operation_details?.tipo_cambio_cesion || null,
        equivalente_ars_cesion: operation_details?.equivalente_ars_cesion || null,
        // Beneficiary assignment
        beneficiario_cedente: aiData.cesion_beneficiario?.cedente_nombre || null,
        beneficiario_cesionario: aiData.cesion_beneficiario?.cesionario_nombre || null,
        fecha_cesion: safeParseDate(aiData.cesion_beneficiario?.fecha_cesion) || null
    }]).select().single();

    if (opError) db_logs.push(`Op Error: ${opError.message}`);

    const processedParticipants = new Set<string>();

    // --- STEP: Add Actors from Fiduciary Metadata (if missing from entities) ---
    if (aiData.cesion_beneficiario) {
        const { cedente_nombre, cesionario_nombre, cesionario_dni } = aiData.cesion_beneficiario;

        if (cedente_nombre && !clientes.some((cl: any) => cl.nombre_completo.toUpperCase().includes(cedente_nombre.toUpperCase()))) {
            clientes.push({
                rol: 'CEDENTE',
                nombre_completo: cedente_nombre,
                dni: null,
                tipo_persona: 'FISICA',
                cuit_is_formal: false
            });
        }

        if (cesionario_nombre && !clientes.some((cl: any) => cl.nombre_completo.toUpperCase().includes(cesionario_nombre.toUpperCase()))) {
            clientes.push({
                rol: 'CESIONARIO',
                nombre_completo: cesionario_nombre,
                dni: cesionario_dni,
                tipo_persona: 'FISICA',
                cuit_is_formal: false
            });
        }
    }

    for (const c of clientes) {
        // Fallback: Si no hay DNI (PJ), usar CUIT como ID único en la tabla personas
        let finalID = normalizeID(c.dni);
        const cleanCuit = normalizeID(c.cuit);

        if (!finalID && cleanCuit) {
            console.log(`[PERSIST] Entity ${c.nombre_completo} has no DNI, using CUIT as ID.`);
            finalID = cleanCuit;
        }

        if (!finalID) {
            // FALLBACK for CEDENTES or other critical actors without ID in the text
            if (c.rol === 'CEDENTE' || c.rol === 'PROPIETARIO ANTERIOR') {
                finalID = `TEMP-${Date.now()}-${c.nombre_completo.substring(0, 5).toUpperCase()}`;
                console.log(`[PERSIST] Entity ${c.nombre_completo} has no ID, generated fallback: ${finalID}`);
            } else {
                console.warn(`[PERSIST] Skipping entity ${c.nombre_completo} - NO ID (DNI/CUIT)`);
                continue;
            }
        }

        // --- SMART CHECK: Persona ---
        const { data: existingPerson } = await supabaseAdmin
            .from('personas')
            .select('*')
            .eq('dni', finalID)
            .maybeSingle();

        const extractedPersona = {
            dni: finalID,
            tipo_persona: c.tipo_persona || 'FISICA',  // NEW: Add tipo_persona
            nombre_completo: c.tipo_persona === 'JURIDICA' || c.tipo_persona === 'FIDEICOMISO' ? c.nombre_completo : toTitleCase(c.nombre_completo),
            cuit: normalizeID(c.cuit),
            cuit_tipo: c.cuit_tipo || 'CUIT',
            cuit_is_formal: c.cuit_is_formal ?? true,
            nacionalidad: c.nacionalidad ? toTitleCase(c.nacionalidad) : null,
            fecha_nacimiento: safeParseDate(c.fecha_nacimiento),
            domicilio_real: c.domicilio_real,
            estado_civil_detalle: c.estado_civil || null,
            nombres_padres: c.nombres_padres || null,
            datos_conyuge: c.datos_conyuge || null
        };

        if (existingPerson) {
            // Compare critical fields: address, marital status, full name
            const addressChanged = existingPerson.domicilio_real?.literal !== extractedPersona.domicilio_real?.literal;
            const statusChanged = existingPerson.estado_civil_detalle !== extractedPersona.estado_civil_detalle;
            const nameChanged = existingPerson.nombre_completo !== extractedPersona.nombre_completo;

            if (addressChanged || statusChanged || nameChanged) {
                conflicts.push({
                    type: 'PERSONA',
                    id: finalID,
                    existing: existingPerson,
                    extracted: extractedPersona
                });
            }
        }

        const { error: pError } = await supabaseAdmin.from('personas').upsert({
            ...extractedPersona,
            origen_dato: 'IA_OCR',
            updated_at: new Date().toISOString()
        }, { onConflict: 'dni' });

        if (pError) db_logs.push(`Person Error (${finalID}): ${pError.message}`);
        else {
            persistedClients++;
            if (operacion) {
                const participantKey = `${operacion.id}-${finalID}`;
                if (!processedParticipants.has(participantKey)) {
                    await supabaseAdmin.from('participantes_operacion').insert([{
                        operacion_id: operacion.id,
                        persona_id: finalID,
                        rol: String(c.caracter ? `${c.rol} (${c.caracter})` : c.rol).toUpperCase().substring(0, 150)
                    }]);
                    processedParticipants.add(participantKey);
                } else {
                    console.log(`[PERSIST] Skipping duplicate participant link for ${finalID} in op ${operacion.id}`);
                }
            }
        }
    }

    // --- STEP: Spouse Symmetry (if Person A has spouse B, ensure B has A) ---
    for (const c of clientes) {
        const personId = normalizeID(c.dni || c.cuit);
        if (!personId) continue;

        if (c.datos_conyuge && (c.datos_conyuge.dni || c.datos_conyuge.cuit)) {
            const spouseId = normalizeID(c.datos_conyuge.dni || c.datos_conyuge.cuit);
            if (!spouseId) continue;

            const { data: personData } = await supabaseAdmin.from('personas').select('nombre_completo').eq('dni', personId).single();

            if (personData) {
                // Update spouse record with personData's info (mirror effect)
                await supabaseAdmin.from('personas').update({
                    datos_conyuge: {
                        nombre: personData.nombre_completo,
                        dni: personId,
                        nombre_completo: personData.nombre_completo
                    }
                }).eq('dni', spouseId);
            }
        }
    }

    // If there are conflicts, update the folder status and save the conflicts metadata
    if (conflicts.length > 0) {
        await supabaseAdmin.from('carpetas').update({
            ingesta_estado: 'REVISION_REQUERIDA',
            ingesta_metadata: { conflicts }
        }).eq('id', folderId);
    }

    return {
        folderId,
        success: true,
        persistedClients: processedParticipants.size,
        db_logs,
        error: null,
        fileName,
        hasConflicts: conflicts.length > 0
    };
}

export async function GET() { return NextResponse.json({ status: "alive" }); }
