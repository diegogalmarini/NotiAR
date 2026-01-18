import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { normalizeID, toTitleCase } from '@/lib/utils/normalization';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validamos que venga el tax_id y nombre_completo aunque sea una simulación
        if (!body.tax_id || !body.nombre_completo) {
            return NextResponse.json(
                { error: 'Tax ID and Nombre Completo are required' },
                { status: 400 }
            );
        }

        // Normalización mandatoria
        const normalizedData = {
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

        // Lógica Upsert en Supabase
        const { data, error } = await supabase
            .from('personas')
            .upsert(normalizedData, { onConflict: 'tax_id' })
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            message: 'Data ingested successfully',
            data
        });

    } catch (error) {
        console.error('Ingest API error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
