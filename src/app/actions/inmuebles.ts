'use server';

import { supabase } from "@/lib/supabaseClient";
import { revalidatePath } from "next/cache";

export async function deleteInmueble(id: string) {
    try {
        const { error } = await supabase
            .from('inmuebles')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting inmueble:', error);
            return { success: false, error: error.message };
        }

        revalidatePath('/inmuebles');
        return { success: true };
    } catch (error) {
        console.error('Exception deleting inmueble:', error);
        return { success: false, error: 'Error inesperado al eliminar el inmueble' };
    }
}
