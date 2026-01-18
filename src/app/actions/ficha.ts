"use server";

import { supabase } from "@/lib/supabaseClient";
import { randomUUID } from "node:crypto";

export async function createFichaToken(personaId: string) {
    try {
        // Generate a random token
        const token = randomUUID();

        // Expiration: 7 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const { data, error } = await supabase
            .from("fichas_web_tokens")
            .insert([{
                id: token,
                persona_id: personaId,
                estado: "PENDIENTE",
                expires_at: expiresAt.toISOString()
            }])
            .select()
            .single();

        if (error) throw error;

        // Build the full URL (In production we should use the actual domain)
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
        const url = `${baseUrl}/ficha/${token}`;

        return { success: true, url };
    } catch (error: any) {
        console.error("Error creating ficha token:", error);
        return { success: false, error: error.message };
    }
}
