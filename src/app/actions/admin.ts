"use server";

import { supabase } from "@/lib/supabaseClient";
import { revalidatePath } from "next/cache";

const SUPER_ADMIN_EMAIL = "diegogalmarini@gmail.com";

/**
 * Verify if the current user is a super admin
 */
async function isAdmin(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.email === SUPER_ADMIN_EMAIL;
}

/**
 * Get all users with their approval status
 */
export async function getAllUsers() {
    try {
        if (!(await isAdmin())) {
            return { success: false, error: "Unauthorized", data: [] };
        }

        const { data, error } = await supabase
            .from("user_profiles")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        return { success: true, data: data || [] };
    } catch (error: any) {
        console.error("Error fetching users:", error);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Approve a user
 */
export async function approveUser(userId: string) {
    try {
        if (!(await isAdmin())) {
            return { success: false, error: "Unauthorized" };
        }

        const { data: { session } } = await supabase.auth.getSession();

        const { error } = await supabase
            .from("user_profiles")
            .update({
                approval_status: "approved",
                approved_by: session?.user?.id,
                approved_at: new Date().toISOString(),
            })
            .eq("id", userId);

        if (error) throw error;

        revalidatePath("/admin/users");
        return { success: true };
    } catch (error: any) {
        console.error("Error approving user:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Reject a user
 */
export async function rejectUser(userId: string) {
    try {
        if (!(await isAdmin())) {
            return { success: false, error: "Unauthorized" };
        }

        const { data: { session } } = await supabase.auth.getSession();

        const { error } = await supabase
            .from("user_profiles")
            .update({
                approval_status: "rejected",
                approved_by: session?.user?.id,
                approved_at: new Date().toISOString(),
            })
            .eq("id", userId);

        if (error) throw error;

        revalidatePath("/admin/users");
        return { success: true };
    } catch (error: any) {
        console.error("Error rejecting user:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a user (removes from auth.users and user_profiles via CASCADE)
 */
export async function deleteUser(userId: string) {
    try {
        if (!(await isAdmin())) {
            return { success: false, error: "Unauthorized" };
        }

        // Delete from user_profiles (auth.users will cascade delete via trigger)
        const { error } = await supabase
            .from("user_profiles")
            .delete()
            .eq("id", userId);

        if (error) throw error;

        revalidatePath("/admin/users");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting user:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Get user statistics
 */
export async function getUserStats() {
    try {
        if (!(await isAdmin())) {
            return { success: false, error: "Unauthorized", data: null };
        }

        const { data, error } = await supabase
            .from("user_profiles")
            .select("approval_status");

        if (error) throw error;

        const stats = {
            total: data.length,
            pending: data.filter(u => u.approval_status === "pending").length,
            approved: data.filter(u => u.approval_status === "approved").length,
            rejected: data.filter(u => u.approval_status === "rejected").length,
        };

        return { success: true, data: stats };
    } catch (error: any) {
        console.error("Error fetching user stats:", error);
        return { success: false, error: error.message, data: null };
    }
}
