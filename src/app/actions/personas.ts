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
                contacto: {
                    email: formData.email,
                    telefono: formData.telefono
                },
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                throw new Error("Ya existe un cliente con ese CUIT/DNI.");
            }
            throw error;
        }

        await logAction('CREATE', 'PERSONA', { id: data.tax_id, tax_id: data.tax_id });

        revalidatePath('/clientes');
        return { success: true, data };
    } catch (error: any) {
        console.error("Error creating persona:", error);
        return { success: false, error: error.message };
    }
}

export async function updatePersona(taxId: string, formData: {
    nombre_completo: string;
    email?: string;
    telefono?: string;
}) {
    try {
        const { data, error } = await supabase
            .from("personas")
            .update({
                nombre_completo: formData.nombre_completo,
                contacto: {
                    email: formData.email,
                    telefono: formData.telefono
                },
                updated_at: new Date().toISOString()
            })
            .eq("tax_id", taxId)
            .select()
            .single();

        if (error) throw error;

        await logAction('UPDATE', 'PERSONA', { id: taxId, tax_id: taxId });

        revalidatePath('/clientes');
        return { success: true, data };
    } catch (error: any) {
        console.error("Error updating persona:", error);
        return { success: false, error: error.message };
    }
}
