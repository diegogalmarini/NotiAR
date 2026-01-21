"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

export async function listStorageFiles(bucket: string, prefix: string) {
    try {
        const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .list(prefix);

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error(`[STORAGE] Error listing files in ${bucket}/${prefix}:`, error);
        return { success: false, error: error.message };
    }
}

export async function deleteStorageFile(bucket: string, path: string) {
    try {
        const { error } = await supabaseAdmin.storage
            .from(bucket)
            .remove([path]);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error(`[STORAGE] Error deleting file ${bucket}/${path}:`, error);
        return { success: false, error: error.message };
    }
}

export async function getSignedUrl(bucket: string, path: string) {
    try {
        const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .createSignedUrl(path, 3600); // 1 hour

        if (error) throw error;
        return { success: true, url: data.signedUrl };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
