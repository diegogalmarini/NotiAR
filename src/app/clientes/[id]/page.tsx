import { supabase } from "@/lib/supabaseClient";
import { notFound } from "next/navigation";
import { ClientProfile } from "@/components/ClientProfile";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: rawId } = await params;
    // Decode URI component because id might contain special characters (though unlikely for CUIT/DNI)
    const id = decodeURIComponent(rawId);

    const { data: persona, error } = await supabase
        .from("personas")
        .select("*")
        .eq("dni", id)
        .single();

    if (error || !persona) {
        console.error("Error fetching persona or not found:", error);
        notFound();
    }

    return <ClientProfile persona={persona} />;
}
