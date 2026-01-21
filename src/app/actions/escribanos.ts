"use server";

import { createClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

export type Escribano = {
    id: string;
    nombre_completo: string;
    caracter: 'TITULAR' | 'ADSCRIPTO' | 'INTERINO';
    numero_registro?: string;
    distrito_notarial?: string;
    matricula?: string;
    cuit?: string;
    domicilio_legal?: string;
    genero_titulo: 'ESCRIBANO' | 'ESCRIBANA' | 'NOTARIO' | 'NOTARIA';
    is_default: boolean;
    created_at?: string;
};

export async function getEscribanos() {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("escribanos")
            .select("*")
            .order("nombre_completo", { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error("Error fetching escribanos:", error);
        return { success: false, error: error.message };
    }
}

export async function getDefaultEscribano() {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("escribanos")
            .select("*")
            .eq("is_default", true)
            .maybeSingle();

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error("Error fetching default escribano:", error);
        return { success: false, error: error.message };
    }
}

export async function createEscribano(data: Omit<Escribano, 'id' | 'is_default'>) {
    try {
        const supabase = await createClient();
        const { data: newEscribano, error } = await supabase
            .from("escribanos")
            .insert([data])
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/admin/users");
        return { success: true, data: newEscribano };
    } catch (error: any) {
        console.error("Error creating escribano:", error);
        return { success: false, error: error.message };
    }
}

export async function updateEscribano(id: string, data: Partial<Escribano>) {
    try {
        const supabase = await createClient();
        const { data: updated, error } = await supabase
            .from("escribanos")
            .update(data)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/admin/users");
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error updating escribano:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteEscribano(id: string) {
    try {
        const supabase = await createClient();
        const { error } = await supabase
            .from("escribanos")
            .delete()
            .eq("id", id);

        if (error) throw error;

        revalidatePath("/admin/users");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting escribano:", error);
        return { success: false, error: error.message };
    }
}

export async function setDefaultEscribano(id: string) {
    try {
        const supabase = await createClient();
        // Since we have a unique index on is_default = true, 
        // we must first unset the existing default if any.

        // Transaction-like behavior: 
        // 1. Unset all defaults
        const { error: unsetError } = await supabase
            .from("escribanos")
            .update({ is_default: false })
            .eq("is_default", true);

        if (unsetError) throw unsetError;

        // 2. Set the new default
        const { data: updated, error: setError } = await supabase
            .from("escribanos")
            .update({ is_default: true })
            .eq("id", id)
            .select()
            .single();

        if (setError) throw setError;

        revalidatePath("/admin/users");
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error setting default escribano:", error);
        return { success: false, error: error.message };
    }
}
