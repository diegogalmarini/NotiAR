import { supabase } from "@/lib/supabaseClient";

/**
 * Log an action to the audit_logs table
 */
export async function logAction(action: string, entity: string, details: any = {}) {
    try {
        const { data: { session } } = await supabase.auth.getSession();

        const { error } = await supabase
            .from("audit_logs")
            .insert([{
                user_id: session?.user?.id,
                action,
                entity,
                details
            }]);

        if (error) {
            console.error("Failed to log action:", error);
        }
    } catch (err) {
        console.error("Error in logAction:", err);
    }
}
