import { supabase } from "@/lib/supabaseClient";
import { notFound } from "next/navigation";
import { ClientProfile } from "@/components/ClientProfile";

export default async function ClientPage({ params }: { params: { id: string } }) {
    // Decode URI component because tax_id might contain special characters (though unlikely for CUIT/DNI)
    const id = decodeURIComponent(params.id);

    const { data: persona, error } = await supabase
        .from("personas")
        .select("*")
        .eq("tax_id", id)
        .single();

    if (error || !persona) {
        console.error("Error fetching persona or not found:", error);
        notFound();
    }

    return <ClientProfile persona={persona} />;
}
