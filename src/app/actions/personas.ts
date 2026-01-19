"use server";

import { supabase } from "@/lib/supabaseClient";
import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/logger";

export async function createPersona(formData: {
    nombre_completo: string;
    tax_id: string;
    email?: string;
    telefono?: string;
}) {
    try {
        const { data, error } = await supabase
            .from("personas")
            .insert([{
                nombre_completo: formData.nombre_completo,
                tax_id: formData.tax_id,
                email: formData.email,
                telefono: formData.telefono
            }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                throw new Error("Ya existe un cliente con ese CUIT/DNI.");
            }
            throw error;
        }

        await logAction('CREATE', 'PERSONA', { id: data.id, tax_id: data.tax_id });

        revalidatePath('/clientes');
        return { success: true, data };
    } catch (error: any) {
        console.error("Error creating persona:", error);
        return { success: false, error: error.message };
    }
}
