import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { normalizeID, toTitleCase } from '@/lib/utils/normalization';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 1. Ingest Persona
        let personData = null;
        if (body.tax_id && body.nombre_completo) {
            const normalizedPerson = {
                tax_id: normalizeID(body.tax_id),
                nombre_completo: toTitleCase(body.nombre_completo),
                nacionalidad: body.nacionalidad ? toTitleCase(body.nacionalidad) : null,
                fecha_nacimiento: body.fecha_nacimiento,
                estado_civil_detallado: body.estado_civil_detallado || {},
                domicilio_real: body.domicilio_real || {},
                contacto: body.contacto || {},
                origen_dato: body.origen_dato || 'IA_OCR',
                updated_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('personas')
                .upsert(normalizedPerson, { onConflict: 'tax_id' })
                .select()
                .single();

            if (error) throw error;
            personData = data;
        }

        // 2. Ingest Inmueble (Optional)
        let propertyData = null;
        if (body.partido_id && body.nro_partida) {
            const normalizedProperty = {
                partido_id: body.partido_id,
                nro_partida: body.nro_partida,
                nomenclatura_catastral: body.nomenclatura_catastral || {},
                valuacion_fiscal: body.valuacion_fiscal || {},
                datos_inscripcion: body.datos_inscripcion || {},
                updated_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('inmuebles')
                .upsert(normalizedProperty, { onConflict: 'partido_id,nro_partida' })
                .select()
                .single();

            if (error) throw error;
            propertyData = data;
        }

        // 3. Create Folder and Link (The "Magic")
        let folderId = null;
        if (body.create_folder) {
            // Create Folder
            const { data: carpeta, error: carpetaError } = await supabase
                .from('carpetas')
                .insert([{ caratula: body.folder_name || 'Nueva Carpeta Ingesta', estado: 'ABIERTA' }])
                .select()
                .single();
            if (carpetaError) throw carpetaError;
            folderId = carpeta.id;

            // Create Deed
            const { data: escritura, error: escrituraError } = await supabase
                .from('escrituras')
                .insert([{
                    carpeta_id: folderId,
                    inmueble_princ_id: propertyData?.id || null
                }])
                .select()
                .single();
            if (escrituraError) throw escrituraError;

            // Create Operation
            const { data: operacion, error: operacionError } = await supabase
                .from('operaciones')
                .insert([{
                    escritura_id: escritura.id,
                    tipo_acto: body.tipo_acto || 'COMPRAVENTA'
                }])
                .select()
                .single();
            if (operacionError) throw operacionError;

            // Link Person as Participant (Default role: VENDEDOR for magic)
            if (personData) {
                const { error: linkError } = await supabase
                    .from('participantes_operacion')
                    .insert([{
                        operacion_id: operacion.id,
                        persona_id: personData.tax_id,
                        rol: body.rol || 'VENDEDOR'
                    }]);
                if (linkError) throw linkError;
            }
        }

        return NextResponse.json({
            message: 'Magic ingestion complete',
            folderId,
            person: personData,
            property: propertyData
        });

    } catch (error: any) {
        console.error('Ingest API error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
