"use server";

import { supabase } from "@/lib/supabaseClient";
import { revalidatePath } from "next/cache";

export async function updateEscritura(escrituraId: string, data: {
    nro_protocolo?: number | null;
    fecha_escritura?: string | null;
    notario_interviniente?: string | null;
    registro?: string | null;
}) {
    try {
        const { error } = await supabase
            .from("escrituras")
            .update(data)
            .eq("id", escrituraId);

        if (error) throw error;

        revalidatePath("/carpeta/[id]");
        return { success: true };
    } catch (error: any) {
        console.error("[UPDATE ESCRITURA]", error);
        return { success: false, error: error.message };
    }
}

export async function updateOperacion(operacionId: string, data: {
    tipo_acto?: string;
    nro_acto?: string | null;
}) {
    try {
        const { error } = await supabase
            .from("operaciones")
            .update(data)
            .eq("id", operacionId);

        if (error) throw error;

        revalidatePath("/carpeta/[id]");
        return { success: true };
    } catch (error: any) {
        console.error("[UPDATE OPERACION]", error);
        return { success: false, error: error.message };
    }
}

export async function updateInmueble(inmuebleId: string, data: {
    partido_id?: string;
    nro_partida?: string;
}) {
    try {
        const { error } = await supabase
            .from("inmuebles")
            .update(data)
            .eq("id", inmuebleId);

        if (error) throw error;

        revalidatePath("/carpeta/[id]");
        return { success: true };
    } catch (error: any) {
        console.error("[UPDATE INMUEBLE]", error);
        return { success: false, error: error.message };
    }
}
