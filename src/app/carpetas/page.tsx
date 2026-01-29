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

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CarpetasPage() {
    const { data: carpetas, error } = await supabase
        .from("carpetas")
        .select("*");

    console.log("📂 CARPETAS FETCHED:", carpetas?.length, "ERROR:", error);

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
                                <TableHead className="w-[80px] text-xs font-normal text-muted-foreground">Número</TableHead>
                                <TableHead className="text-xs font-normal text-muted-foreground">Carátula</TableHead>
                                <TableHead className="text-right text-xs font-normal text-muted-foreground">Estado</TableHead>
                                <TableHead className="text-right text-xs font-normal text-muted-foreground">Creada el</TableHead>
                                <TableHead className="text-right text-xs font-normal text-muted-foreground">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {carpetas?.map((carpeta) => (
                                <TableRow key={carpeta.id} className="group">
                                    <TableCell className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                                        #{carpeta.nro_carpeta_interna}
                                    </TableCell>
                                    <TableCell className="text-sm font-normal py-2.5 leading-tight text-slate-700">
                                        {carpeta.caratula || "Sin carátula"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge
                                            variant={carpeta.estado === "ABIERTA" ? "secondary" : "default"}
                                            className={cn(
                                                "text-[10px] px-2 py-0.5 h-5 font-normal",
                                                carpeta.estado === "FIRMADA" && "bg-green-100 text-green-700 hover:bg-green-200 border-none",
                                                carpeta.estado === "EN_REDACCION" && "bg-blue-100 text-blue-700 hover:bg-blue-200 border-none",
                                                carpeta.estado === "PARA_FIRMA" && "bg-amber-100 text-amber-700 hover:bg-amber-200 border-none"
                                            )}
                                        >
                                            {carpeta.estado}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right text-[11px] font-light text-muted-foreground whitespace-nowrap">
                                        {new Date(carpeta.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild className="h-7 text-[11px] font-normal">
                                            <Link href={`/carpeta/${carpeta.id}`}>
                                                <FileText className="h-3.5 w-3.5 mr-1" />
                                                Mesa
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
