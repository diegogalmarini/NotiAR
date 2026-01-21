"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
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
import { VerInmuebleDialog, DownloadInmuebleButton } from "@/components/VerInmuebleDialog";
import { DeleteInmuebleDialog } from "@/components/DeleteInmuebleDialog";

export default function InmueblesPage() {
    const [inmuebles, setInmuebles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchInmuebles() {
            try {
                const { data, error } = await supabase
                    .from("inmuebles")
                    .select("*");

                if (error) {
                    console.error("Error fetching inmuebles:", error);
                } else if (data) {
                    console.log("🏠 Fetched", data.length, "inmuebles");
                    setInmuebles(data);
                }
            } catch (err) {
                console.error("Exception fetching inmuebles:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchInmuebles();
    }, []);

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

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
                    <Table className="table-fixed border-collapse">
                        <TableHeader>
                            <TableRow className="bg-slate-50/50">
                                <TableHead className="w-[15%] text-xs font-normal text-muted-foreground">Partido / Dpto</TableHead>
                                <TableHead className="w-[15%] text-xs font-normal text-muted-foreground">Nro. Partida</TableHead>
                                <TableHead className="w-[20%] text-xs font-normal text-muted-foreground">Nomenclatura</TableHead>
                                <TableHead className="w-[38%] text-xs font-normal text-muted-foreground">Transcripción Literal</TableHead>
                                <TableHead className="text-right w-[12%] text-xs font-normal text-muted-foreground">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {inmuebles?.map((inmueble) => (
                                <TableRow key={inmueble.id} className="group hover:bg-slate-50/50">
                                    <TableCell className="py-2 align-top truncate" title={inmueble.partido_id}>
                                        <div className="flex items-center gap-2 truncate text-sm font-normal text-slate-700">
                                            <span className="truncate">{inmueble.partido_id || 'N/A'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs font-light align-top py-2 text-slate-600">
                                        {inmueble.nro_partida || 'N/A'}
                                    </TableCell>
                                    <TableCell className="align-top py-2">
                                        <div className="text-xs line-clamp-2 leading-tight font-normal text-slate-700">
                                            {inmueble.nomenclatura || 'Sin nomenclatura'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top py-2">
                                        <div className="text-xs text-muted-foreground line-clamp-2 leading-snug max-w-md font-light" title={inmueble.transcripcion_literal}>
                                            {inmueble.transcripcion_literal || 'No disponible'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right align-top py-2">
                                        <div className="flex justify-end items-center gap-1">
                                            <VerInmuebleDialog inmueble={inmueble} />
                                            <DeleteInmuebleDialog
                                                inmuebleId={inmueble.id}
                                                nomenclatura={inmueble.nomenclatura}
                                                onInmuebleDeleted={() => window.location.reload()}
                                            />
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
