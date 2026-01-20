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
import { formatDateInstructions } from "@/lib/utils";

export default function ClientesPage() {
    const [personas, setPersonas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPersonas = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("personas")
                .select("*")
                .order("nombre_completo", { ascending: true });

            if (error) {
                console.error("Error fetching personas:", error);
            } else if (data) {
                console.log("Fetched", data.length, "personas");
                setPersonas(data);
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

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar por nombre, CUIT o DNI..." className="pl-10" />
                        </div>
                        <Button variant="outline">Filtrar</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre Completo</TableHead>
                                <TableHead>DNI</TableHead>
                                <TableHead>Contacto</TableHead>
                                <TableHead>Origen</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {personas?.map((persona) => (
                                <TableRow key={persona.tax_id} className="group">
                                    <TableCell className="font-semibold">
                                        <div className="flex flex-col">
                                            <span>{persona.nombre_completo}</span>
                                            {persona.fecha_nacimiento && (
                                                <span className="text-xs text-muted-foreground font-normal">
                                                    Nac: {formatDateInstructions(persona.fecha_nacimiento)}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">
                                        {persona.tax_id}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            {persona.contacto?.telefono && (
                                                <Badge variant="outline" className="flex items-center gap-1">
                                                    <Phone size={10} /> {persona.contacto.telefono}
                                                </Badge>
                                            )}
                                            {persona.contacto?.email && (
                                                <Badge variant="outline" className="flex items-center gap-1">
                                                    <Mail size={10} /> {persona.contacto.email}
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={persona.origen_dato === 'IA_OCR' ? "secondary" : "outline"}>
                                            {persona.origen_dato}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <SendFichaDialog persona={persona} />
                                            <EditarClienteDialog persona={persona} />
                                            <DeleteClienteDialog
                                                personaId={persona.tax_id}
                                                personaNombre={persona.nombre_completo}
                                                onClienteDeleted={fetchPersonas}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!personas || personas.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                                        <Users className="mx-auto h-12 w-12 opacity-20 mb-4" />
                                        No se encontraron clientes en la base de datos.
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
