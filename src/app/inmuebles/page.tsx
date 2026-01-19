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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Building2, Edit2, MapPinned, FileSearch } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { NuevoInmuebleDialog } from "@/components/NuevoInmuebleDialog";

export default async function InmueblesPage() {
    const { data: inmuebles, error } = await supabase
        .from("inmuebles")
        .select("*");

    console.log("🏠 INMUEBLES FETCHED:", inmuebles?.length, "ERROR:", error);

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inmuebles</h1>
                    <p className="text-muted-foreground">Base de datos de propiedades y nomenclaturas catastrales.</p>
                </div>
                <NuevoInmuebleDialog />
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar por partida, partido o nomenclatura..." className="pl-10" />
                        </div>
                        <Button variant="outline">Filtrar</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ubicación / Partido</TableHead>
                                <TableHead>Nro. Partida</TableHead>
                                <TableHead>Nomenclatura Catastral</TableHead>
                                <TableHead>Valuación</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {inmuebles?.map((inmueble) => (
                                <TableRow key={inmueble.id} className="group">
                                    <TableCell>
                                        <div className="flex items-start gap-2">
                                            <MapPinned className="h-4 w-4 mt-0.5 text-primary opacity-70" />
                                            <div>
                                                <div className="font-semibold">{inmueble.nomenclatura_catastral?.partido || "Sin Partido"}</div>
                                                <div className="text-xs text-muted-foreground">ID Partido: {inmueble.partido_id}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono">
                                        {inmueble.nro_partida}
                                    </TableCell>
                                    <TableCell className="text-xs font-mono max-w-[200px] truncate">
                                        {JSON.stringify(inmueble.nomenclatura_catastral)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm font-medium">
                                            ${inmueble.valuacion_fiscal?.impuesto_total || "0"}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground uppercase">Impuesto Total</div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="group-hover:bg-slate-100">
                                                <FileSearch size={16} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="group-hover:bg-slate-100">
                                                <Edit2 size={16} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!inmuebles || inmuebles.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                                        <Building2 className="mx-auto h-12 w-12 opacity-20 mb-4" />
                                        No se encontraron inmuebles registrados.
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
