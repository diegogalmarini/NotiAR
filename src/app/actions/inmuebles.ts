'use server';

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

export async function deleteInmueble(id: string) {
    try {
        const { error } = await supabaseAdmin
            .from('inmuebles')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting inmueble:', error);
            // Si el error es por una Foreign Key Constraint (code 23503)
            if (error.code === '23503') {
                return {
                    success: false,
                    error: "No se puede eliminar el inmueble porque está siendo utilizado en una o más escrituras. Desvincúlelo primero."
                };
            }
            return { success: false, error: error.message };
        }

        revalidatePath('/inmuebles');
        return { success: true };
    } catch (error: any) {
        console.error('Exception deleting inmueble:', error);
        return { success: false, error: error.message || 'Error inesperado al eliminar el inmueble' };
    }
}
