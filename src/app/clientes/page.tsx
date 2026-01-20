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
import { Search, Edit2, UserPlus, Phone, Mail, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NuevoClienteDialog } from "@/components/NuevoClienteDialog";
import { EditarClienteDialog } from "@/components/EditarClienteDialog";
import { SendFichaDialog } from "@/components/SendFichaDialog";

export default async function ClientesPage() {
    const { data: personas, error } = await supabase
        .from("personas")
        .select("*")
        .order("nombre_completo", { ascending: true });

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
                                <TableHead>Identificación (Tax ID)</TableHead>
                                <TableHead>Contacto</TableHead>
                                <TableHead>Origen</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {personas?.map((persona) => (
                                <TableRow key={persona.tax_id} className="group">
                                    <TableCell className="font-semibold">
                                        {persona.nombre_completo}
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
