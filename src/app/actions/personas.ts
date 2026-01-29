"use server";

import { createClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/logger";


export async function createPersona(formData: {
    nombre_completo: string;
    dni: string;
    email?: string;
    cuit?: string;
    cuit_tipo?: string;
    cuit_is_formal?: boolean;
}) {
    try {
        const supabase = await createClient();
        // Generate a temporary DNI if not provided
        const finalDni = formData.dni?.trim()
            ? formData.dni.trim()
            : `SIN-DNI-${Date.now()}`;

        const { data, error } = await supabase
            .from("personas")
            .insert([{
                nombre_completo: formData.nombre_completo,
                dni: finalDni,
                cuit: formData.cuit || null,
                cuit_tipo: formData.cuit_tipo || 'CUIT',
                cuit_is_formal: formData.cuit_is_formal ?? true,
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
                throw new Error("Ya existe un cliente con ese DNI.");
            }
            throw error;
        }

        await logAction('CREATE', 'PERSONA', { id: data.dni, dni: data.dni });

        revalidatePath('/clientes');
        return { success: true, data };
    } catch (error: any) {
        console.error("Error creating persona:", error);
        return { success: false, error: error.message };
    }
}

export async function updatePersona(dni: string, formData: {
    nombre_completo: string;
    nacionalidad?: string;
    fecha_nacimiento?: string;
    estado_civil?: string;
    nombres_padres?: string;
    nombre_conyuge?: string;
    domicilio?: string;
    email?: string;
    dni?: string;
    cuit?: string;
    cuit_tipo?: string;
    cuit_is_formal?: boolean;
}) {
    try {
        const supabase = await createClient();
        const updateData: any = {
            nombre_completo: formData.nombre_completo,
            nacionalidad: formData.nacionalidad || null,
            fecha_nacimiento: formData.fecha_nacimiento || null,
            estado_civil_detalle: formData.estado_civil || null,
            nombres_padres: formData.nombres_padres || null,
            datos_conyuge: formData.nombre_conyuge ? { nombre_completo: formData.nombre_conyuge } : null,
            domicilio_real: formData.domicilio ? { literal: formData.domicilio } : null,
            contacto: {
                email: formData.email,
                telefono: formData.telefono
            },
            dni: formData.dni || dni,
            cuit: formData.cuit || null,
            cuit_tipo: formData.cuit_tipo || 'CUIT',
            cuit_is_formal: formData.cuit_is_formal ?? true,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from("personas")
            .update(updateData)
            .eq("dni", dni)
            .select()
            .single();

        if (error) throw error;

        await logAction('UPDATE', 'PERSONA', { id: dni, dni: dni });

        revalidatePath('/clientes');
        return { success: true, data };
    } catch (error: any) {
        console.error("Error updating persona:", error);
        return { success: false, error: error.message };
    }
}

export async function deletePersona(dni: string) {
    try {
        const supabase = await createClient();
        const { error } = await supabase
            .from("personas")
            .delete()
            .eq("dni", dni);

        if (error) throw error;

        await logAction('DELETE', 'PERSONA', { id: dni, dni: dni });

        revalidatePath('/clientes');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting persona:", error);
        return { success: false, error: error.message };
    }
}
