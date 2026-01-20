"use server";

import { supabase } from "@/lib/supabaseClient";
import { revalidatePath } from "next/cache";

export async function getFichaByToken(tokenId: string) {
    try {
        const { data: tokenData, error: tokenError } = await supabase
            .from("fichas_web_tokens")
            .select("*, personas(*)")
            .eq("id", tokenId)
            .single();

        if (tokenError) throw tokenError;

        // Check if expired
        if (new Date(tokenData.expires_at) < new Date()) {
            return { success: false, error: "El link ha expirado." };
        }

        if (tokenData.estado === 'COMPLETADA') {
            return { success: false, error: "Esta ficha ya ha sido completada." };
        }

        return { success: true, data: tokenData };
    } catch (error: any) {
        console.error("Error fetching ficha:", error);
        return { success: false, error: "Token inválido o no encontrado." };
    }
}

export async function submitFichaData(tokenId: string, oldDni: string, formData: any) {
    try {
        // 1. Update Persona (DNI is PK, but ON UPDATE CASCADE handles references)
        const { error: pError } = await supabase
            .from("personas")
            .update({
                nombre_completo: formData.nombre_completo,
                dni: formData.dni, // New DNI from the form
                cuit: formData.cuit,
                nacionalidad: formData.nacionalidad,
                fecha_nacimiento: formData.fecha_nacimiento,
                domicilio_real: { literal: formData.domicilio },
                nombres_padres: formData.nombres_padres,
                estado_civil_detalle: formData.estado_civil,
                contacto: {
                    email: formData.email,
                    telefono: formData.telefono
                },
                updated_at: new Date().toISOString()
            })
            .eq("dni", oldDni);

        if (pError) throw pError;

        // 2. Mark Token as Completed
        const { error: tError } = await supabase
            .from("fichas_web_tokens")
            .update({ estado: 'COMPLETADA' })
            .eq("id", tokenId);

        if (tError) throw tError;

        revalidatePath('/clientes');
        return { success: true };
    } catch (error: any) {
        console.error("Error submitting ficha:", error);
        return { success: false, error: error.message };
    }
}

export async function generateFichaLink(personaId: string) {
    try {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const { data, error } = await supabase
            .from("fichas_web_tokens")
            .insert([{
                persona_id: personaId,
                estado: 'PENDIENTE',
                expires_at: expiresAt.toISOString()
            }])
            .select()
            .single();

        if (error) throw error;

        // In a real app, use an env var for the base URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://notiar.vercel.app';
        const link = `${baseUrl}/ficha/${data.id}`;

        return { success: true, link };
    } catch (error: any) {
        console.error("Error generating link:", error);
        return { success: false, error: error.message };
    }
}
