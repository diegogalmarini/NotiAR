"use server";

import { supabase } from "@/lib/supabaseClient";
import { revalidatePath } from "next/cache";

export async function createFolder(caratula?: string) {
    try {
        // 1. Crear la Carpeta
        const { data: carpeta, error: carpetaError } = await supabase
            .from('carpetas')
            .insert([{ caratula, estado: 'ABIERTA' }])
            .select()
            .single();

        if (carpetaError) throw carpetaError;

        // 2. Crear una Escritura Borrador automáticamente (Simplificación solicitada)
        const { data: escritura, error: escrituraError } = await supabase
            .from('escrituras')
            .insert([{ carpeta_id: carpeta.id }])
            .select()
            .single();

        if (escrituraError) throw escrituraError;

        // 3. Crear una Operación Borrador automáticamente (Simplificación solicitada)
        const { data: operacion, error: operacionError } = await supabase
            .from('operaciones')
            .insert([{ escritura_id: escritura.id, tipo_acto: 'COMPRAVENTA' }])
            .select()
            .single();

        if (operacionError) throw operacionError;

        revalidatePath('/dashboard');
        return { success: true, carpetaId: carpeta.id };
    } catch (error: any) {
        console.error('Error creating folder hierarchy:', error);
        return { success: false, error: error.message };
    }
}

export async function addOperationToDeed(escrituraId: string, tipoActo: string, monto?: number) {
    try {
        const { data, error } = await supabase
            .from('operaciones')
            .insert([{ escritura_id: escrituraId, tipo_acto: tipoActo, monto_operacion: monto }])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function linkPersonToOperation(operacionId: string, personaId: string, rol: string, porcentaje?: number) {
    try {
        const { data, error } = await supabase
            .from('participantes_operacion')
            .insert([{
                operacion_id: operacionId,
                persona_id: personaId,
                rol,
                porcentaje_titularidad: porcentaje
            }])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function linkAssetToDeed(escrituraId: string, inmuebleId: string) {
    try {
        const { data, error } = await supabase
            .from('escrituras')
            .update({ inmueble_princ_id: inmuebleId })
            .eq('id', escrituraId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
