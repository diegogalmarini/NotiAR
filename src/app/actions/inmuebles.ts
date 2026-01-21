'use server';

import { createClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

export async function deleteInmueble(id: string) {
    try {
        const supabase = await createClient();
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
