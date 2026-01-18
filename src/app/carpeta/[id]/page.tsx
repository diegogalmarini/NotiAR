import { supabase } from "@/lib/supabaseClient";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Folder, FileText, Activity, Users, Home, UserPlus } from "lucide-react";
import FolderWorkspace from "@/components/FolderWorkspace";

export default async function CarpetaDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // Fetch full hierarchy
    const { data: carpeta, error } = await supabase
        .from("carpetas")
        .select(`
      *,
      escrituras (
        *,
        inmuebles (*),
        operaciones (
          *,
          participantes_operacion (
            *,
            personas (*)
          )
        )
      )
    `)
        .eq("id", id)
        .single();

    if (error || !carpeta) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            #{carpeta.nro_carpeta_interna}
                        </span>
                        <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                            {carpeta.estado}
                        </Badge>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Folder className="h-8 w-8 text-primary" />
                        {carpeta.caratula || "Nueva Carpeta"}
                    </h1>
                </div>
            </div>

            <Separator />

            {/* Main Workspace (Client Component for Interactivity) */}
            <FolderWorkspace initialData={carpeta} />
        </div>
    );
}
