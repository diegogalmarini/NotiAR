"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState, useCallback } from "react";
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
import { Search, Edit2, UserPlus, Phone, Mail, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NuevoClienteDialog } from "@/components/NuevoClienteDialog";
import { EditarClienteDialog } from "@/components/EditarClienteDialog";
import { SendFichaDialog } from "@/components/SendFichaDialog";
import { DeleteClienteDialog } from "@/components/DeleteClienteDialog";
import { cn, formatDateInstructions } from "@/lib/utils";

export default function ClientesPage() {
    const [personas, setPersonas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredPersonas, setFilteredPersonas] = useState<any[]>([]);

    const fetchPersonas = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("personas")
                .select("*")
                .order("nombre_completo", { ascending: true });

            if (error) {
                console.error("Error fetching personas:", error);
            } else if (data) {
                setPersonas(data);
                setFilteredPersonas(data);
            }
        } catch (err) {
            console.error("Exception fetching personas:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPersonas();
    }, [fetchPersonas]);

    // Update filtered list when search term or personas change
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredPersonas(personas);
            return;
        }

        const lowercaseSearch = searchTerm.toLowerCase();
        const filtered = personas.filter(p =>
            p.nombre_completo?.toLowerCase().includes(lowercaseSearch) ||
            p.dni?.toLowerCase().includes(lowercaseSearch) ||
            p.cuit?.toLowerCase().includes(lowercaseSearch)
        );
        setFilteredPersonas(filtered);
    }, [searchTerm, personas]);

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
                    <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
                    <p className="text-muted-foreground">Gestión de personas y participantes vinculados al sistema.</p>
                </div>
                <NuevoClienteDialog />
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="p-4 border-b">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre, CUIT o DNI..."
                                className="pl-10 h-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" className="h-10">Filtrar</Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50">
                                <TableHead className="w-[30%]">Nombre Completo</TableHead>
                                <TableHead className="w-[20%]">Documento</TableHead>
                                <TableHead className="w-[25%]">Contacto</TableHead>
                                <TableHead className="w-[10%] text-center">Origen</TableHead>
                                <TableHead className="text-right w-[15%]">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPersonas?.map((persona) => (
                                <TableRow key={persona.dni} className="group hover:bg-slate-50/50">
                                    <TableCell className="font-semibold py-4">
                                        <div className="flex flex-col">
                                            <span className="text-slate-900">{persona.nombre_completo}</span>
                                            {persona.fecha_nacimiento && (
                                                <span className="text-[10px] text-muted-foreground font-normal uppercase tracking-wider">
                                                    Nac: {formatDateInstructions(persona.fecha_nacimiento)}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] uppercase font-bold text-slate-400">DNI</span>
                                                <span className="font-mono text-xs text-slate-700">
                                                    {persona.dni && persona.dni.startsWith('SIN-DNI-')
                                                        ? <Badge variant="outline" className="font-mono text-[10px] bg-slate-50 text-slate-500 border-dashed">Pendiente</Badge>
                                                        : (persona.dni || 'N/A')}
                                                </span>
                                            </div>
                                            {persona.cuit && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400">CUIT</span>
                                                    <span className="font-mono text-xs text-slate-700">{persona.cuit}</span>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-2">
                                            {persona.contacto?.telefono && (
                                                <a
                                                    href={`tel:${persona.contacto.telefono}`}
                                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 text-slate-600 border border-slate-100 hover:bg-slate-100 hover:text-slate-900 transition-colors text-xs font-medium"
                                                    title="Llamar por teléfono"
                                                >
                                                    <Phone size={12} className="text-slate-400" />
                                                    {persona.contacto.telefono}
                                                </a>
                                            )}
                                            {persona.contacto?.email && (
                                                <a
                                                    href={`mailto:${persona.contacto.email}`}
                                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 text-slate-600 border border-slate-100 hover:bg-slate-100 hover:text-slate-900 transition-colors text-xs font-medium"
                                                    title="Enviar correo electrónico"
                                                >
                                                    <Mail size={12} className="text-slate-400" />
                                                    {persona.contacto.email}
                                                </a>
                                            )}
                                            {!persona.contacto?.telefono && !persona.contacto?.email && (
                                                <span className="text-xs text-slate-400 italic font-normal">Sin datos</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className={cn(
                                            "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight border",
                                            persona.origen_dato === 'IA_OCR'
                                                ? "bg-slate-100 text-slate-600 border-slate-200"
                                                : "bg-white text-slate-400 border-slate-100"
                                        )}>
                                            {persona.origen_dato || 'Manual'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1 px-2">
                                            <SendFichaDialog persona={persona} />
                                            <EditarClienteDialog persona={persona} />
                                            <DeleteClienteDialog
                                                personaId={persona.dni}
                                                personaNombre={persona.nombre_completo}
                                                onClienteDeleted={fetchPersonas}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!filteredPersonas || filteredPersonas.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                                        <Users className="mx-auto h-12 w-12 opacity-20 mb-4" />
                                        {searchTerm ? "No se encontraron resultados para tu búsqueda." : "No se encontraron clientes en la base de datos."}
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
