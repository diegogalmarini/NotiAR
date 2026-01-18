import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, FileText } from "lucide-react";
import { createFolder } from "@/app/actions/carpeta";
import { revalidatePath } from "next/cache";

export default async function DashboardPage() {
    const { data: carpetas, error } = await supabase
        .from("carpetas")
        .select("*")
        .order("created_at", { ascending: false });

    async function handleCreateFolder() {
        "use server";
        await createFolder("Nueva Carpeta");
        revalidatePath("/dashboard");
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Carpetas</h1>
                    <p className="text-muted-foreground">Listado de operaciones notariales activas.</p>
                </div>
                <form action={handleCreateFolder}>
                    <Button type="submit">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nueva Carpeta
                    </Button>
                </form>
            </div>

            <div className="border rounded-lg bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">Nro</TableHead>
                            <TableHead>Carátula</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {carpetas?.map((carpeta) => (
                            <TableRow key={carpeta.id}>
                                <TableCell className="font-medium text-muted-foreground">
                                    #{carpeta.nro_carpeta_interna}
                                </TableCell>
                                <TableCell className="font-semibold">
                                    {carpeta.caratula || "Sin carátula"}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={carpeta.estado === "ABIERTA" ? "secondary" : "default"}>
                                        {carpeta.estado}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {new Date(carpeta.created_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/carpeta/${carpeta.id}`}>
                                            <FileText className="h-4 w-4 mr-2" />
                                            Mesa de Trabajo
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {(!carpetas || carpetas.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                    No hay carpetas creadas aún.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
