"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit2 } from "lucide-react";
import { updatePersona } from "@/app/actions/personas";
import { toast } from "sonner";

interface Persona {
    tax_id: string;
    nombre_completo: string;
    nacionalidad?: string;
    fecha_nacimiento?: string;
    estado_civil_detalle?: string;
    nombres_padres?: string;
    datos_conyuge?: { nombre?: string };
    domicilio_real?: { literal?: string };
    contacto?: {
        email?: string;
        telefono?: string;
    };
}

interface EditarClienteDialogProps {
    persona: Persona;
}

export function EditarClienteDialog({ persona }: EditarClienteDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nombre_completo: persona.nombre_completo,
        nacionalidad: persona.nacionalidad || "",
        fecha_nacimiento: persona.fecha_nacimiento || "",
        estado_civil: persona.estado_civil_detalle || "",
        nombres_padres: persona.nombres_padres || "",
        nombre_conyuge: persona.datos_conyuge?.nombre || "",
        domicilio: persona.domicilio_real?.literal || "",
        email: persona.contacto?.email || "",
        telefono: persona.contacto?.telefono || "",
        dni: (persona as any).dni || "",
        cuit: (persona as any).cuit || "",
        new_tax_id: persona.tax_id
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = await updatePersona(persona.tax_id, formData);

        setLoading(false);
        if (res.success) {
            toast.success("Cliente actualizado correctamente");
            setOpen(false);
            window.location.reload();
        } else {
            toast.error(res.error || "Error al actualizar cliente");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="group-hover:bg-slate-100">
                    <Edit2 size={16} />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Editar Cliente</DialogTitle>
                        <DialogDescription>
                            Modifique los datos del cliente. El CUIT/DNI ({persona.tax_id}) no se puede cambiar.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* Nombre Completo */}
                        {/* Nombre y Apellido Split */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="nombre">Nombre</Label>
                                <Input
                                    id="nombre"
                                    required
                                    value={formData.nombre_completo.split(" ").slice(0, -1).join(" ")}
                                    onChange={(e) => {
                                        const apellido = formData.nombre_completo.split(" ").slice(-1).join(" ");
                                        setFormData({ ...formData, nombre_completo: e.target.value + " " + apellido })
                                    }}
                                    disabled={loading}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="apellido">Apellido</Label>
                                <Input
                                    id="apellido"
                                    required
                                    value={formData.nombre_completo.split(" ").slice(-1)[0]}
                                    onChange={(e) => {
                                        const nombre = formData.nombre_completo.split(" ").slice(0, -1).join(" ");
                                        setFormData({ ...formData, nombre_completo: nombre + " " + e.target.value })
                                    }}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-2">
                            <div className="grid gap-2">
                                <Label htmlFor="dni">DNI (Editable)</Label>
                                <Input
                                    id="dni"
                                    value={formData.dni}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({ ...formData, dni: val, new_tax_id: formData.cuit?.trim() ? formData.cuit : val })
                                    }}
                                    placeholder="DNI"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="cuit">CUIT (Editable)</Label>
                                <Input
                                    id="cuit"
                                    value={formData.cuit}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({ ...formData, cuit: val, new_tax_id: val?.trim() ? val : formData.dni })
                                    }}
                                    placeholder="CUIT"
                                />
                            </div>
                        </div>

                        {/* Nacionalidad */}
                        <div className="grid gap-2">
                            <Label htmlFor="nacionalidad">Nacionalidad *</Label>
                            <Input
                                id="nacionalidad"
                                required
                                value={formData.nacionalidad}
                                onChange={(e) => setFormData({ ...formData, nacionalidad: e.target.value })}
                                placeholder="Ej: Argentina"
                            />
                        </div>

                        {/* Fecha de Nacimiento */}
                        <div className="grid gap-2">
                            <Label htmlFor="fecha_nac">Fecha de Nacimiento</Label>
                            <div className="flex flex-col gap-1">
                                <Input
                                    id="fecha_nac"
                                    type="date"
                                    value={formData.fecha_nacimiento}
                                    onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                                />
                                {formData.fecha_nacimiento && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                        Formato: {new Date(formData.fecha_nacimiento + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Estado Civil */}
                        <div className="grid gap-2">
                            <Label htmlFor="estado_civil">Estado Civil (Detallado)</Label>
                            <Input
                                id="estado_civil"
                                value={formData.estado_civil}
                                onChange={(e) => setFormData({ ...formData, estado_civil: e.target.value })}
                                placeholder="Ej: Casado en primeras nupcias con... / Divorciado de... / Soltero"
                            />
                        </div>

                        {/* Nombres de Padres */}
                        <div className="grid gap-2">
                            <Label htmlFor="padres">Nombres de los Padres (Filiación)</Label>
                            <Input
                                id="padres"
                                value={formData.nombres_padres}
                                onChange={(e) => setFormData({ ...formData, nombres_padres: e.target.value })}
                                placeholder="Obligatorio si soltero/a. Ej: hijo de Juan Pérez y María González"
                            />
                        </div>

                        {/* Nombre del Cónyuge */}
                        <div className="grid gap-2">
                            <Label htmlFor="conyuge">Nombre del Cónyuge (si aplica)</Label>
                            <Input
                                id="conyuge"
                                value={formData.nombre_conyuge}
                                onChange={(e) => setFormData({ ...formData, nombre_conyuge: e.target.value })}
                                placeholder="Si es casado/a"
                            />
                        </div>

                        {/* Domicilio Real */}
                        <div className="grid gap-2">
                            <Label htmlFor="domicilio">Domicilio Real *</Label>
                            <Textarea
                                id="domicilio"
                                required
                                value={formData.domicilio}
                                onChange={(e) => setFormData({ ...formData, domicilio: e.target.value })}
                                placeholder="Dirección completa: calle, número, localidad, provincia"
                                rows={2}
                            />
                        </div>

                        {/* Email */}
                        <div className="grid gap-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="por.ejemplo@correo.com"
                            />
                        </div>

                        {/* Teléfono */}
                        <div className="grid gap-2">
                            <Label htmlFor="tel">Número de Teléfono</Label>
                            <Input
                                id="tel"
                                value={formData.telefono}
                                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                placeholder="Ej: 291 1234567"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Guardando..." : "Guardar Cambios"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
