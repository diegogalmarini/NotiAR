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
                    <Table className="table-fixed">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[15%]">Partido / Dpto</TableHead>
                                <TableHead className="w-[15%]">Nro. Partida</TableHead>
                                <TableHead className="w-[20%]">Nomenclatura</TableHead>
                                <TableHead className="w-[35%]">Transcripción Literal</TableHead>
                                <TableHead className="text-right w-[15%]">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {inmuebles?.map((inmueble) => (
                                <TableRow key={inmueble.id} className="group">
                                    <TableCell className="font-semibold align-top truncate" title={inmueble.partido_id}>
                                        <div className="flex items-center gap-2 truncate">
                                            <MapPinned className="h-4 w-4 text-blue-600 shrink-0" />
                                            <span className="truncate">{inmueble.partido_id || 'N/A'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-sm align-top">
                                        {inmueble.nro_partida || 'N/A'}
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <div className="text-sm line-clamp-3">
                                            {inmueble.nomenclatura || 'Sin nomenclatura'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <div className="text-sm text-muted-foreground line-clamp-2 max-w-md" title={inmueble.transcripcion_literal}>
                                            {inmueble.transcripcion_literal || 'No disponible'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right align-top">
                                        <div className="flex justify-end items-center gap-1">
                                            <VerInmuebleDialog inmueble={inmueble} />
                                            <DownloadInmuebleButton inmueble={inmueble} />
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
