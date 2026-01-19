import { supabase } from "@/lib/supabaseClient";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderKanban, FileText, PlusCircle, Search } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function CarpetasPage() {
    const { data: carpetas, error } = await supabase
        .from("carpetas")
        .select("*")
        .order("created_at", { ascending: false });

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Expedientes / Carpetas</h1>
                    <p className="text-muted-foreground">Listado completo de todas las operaciones notariales.</p>
                </div>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nueva Carpeta
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar por carátula o número..." className="pl-10" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Número</TableHead>
                                <TableHead>Carátula</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Creada el</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {carpetas?.map((carpeta) => (
                                <TableRow key={carpeta.id} className="group">
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        #{carpeta.nro_carpeta_interna}
                                    </TableCell>
                                    <TableCell className="font-semibold">
                                        {carpeta.caratula || "Sin carátula"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={carpeta.estado === "ABIERTA" ? "secondary" : "default"}
                                            className={cn(
                                                carpeta.estado === "FIRMADA" && "bg-green-100 text-green-700 hover:bg-green-200 border-none",
                                                carpeta.estado === "EN_REDACCION" && "bg-blue-100 text-blue-700 hover:bg-blue-200 border-none",
                                                carpeta.estado === "PARA_FIRMA" && "bg-amber-100 text-amber-700 hover:bg-amber-200 border-none"
                                            )}
                                        >
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
                                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                                        <FolderKanban className="mx-auto h-12 w-12 opacity-20 mb-4" />
                                        No se encontraron carpetas.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
