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

    // Deducir DNI y CUIT del tax_id si no están presentes
    const deduceDniCuit = () => {
        const personaAny = persona as any;
        let dni = personaAny.dni || "";
        let cuit = personaAny.cuit || "";

        // Si no hay DNI ni CUIT, pero hay tax_id, intentar deducirlos
        if (!dni && !cuit && persona.tax_id) {
            const taxId = persona.tax_id.replace(/[-\s]/g, '');

            // Si el tax_id tiene 11 dígitos, es un CUIT
            if (taxId.length === 11) {
                cuit = persona.tax_id;
                // El DNI son los dígitos centrales (del 3 al 10)
                dni = taxId.slice(2, 10);
            }
            // Si tiene 8 dígitos o menos, es un DNI
            else if (taxId.length <= 8) {
                dni = persona.tax_id;
            }
        }

        return { dni, cuit };
    };

    const { dni: deducedDni, cuit: deducedCuit } = deduceDniCuit();

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
        dni: deducedDni,
        cuit: deducedCuit,
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
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Editar Cliente</DialogTitle>
                    <DialogDescription>
                        Modifique los datos personales y filiación. Los cambios se aplicarán globalmente.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="grid gap-4 py-4 overflow-y-auto pr-2">
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="dni">DNI</Label>
                                <Input
                                    id="dni"
                                    value={formData.dni}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({ ...formData, dni: val, new_tax_id: formData.cuit?.trim() ? formData.cuit : val })
                                    }}
                                    placeholder="Ej: 27.841.387"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="cuit">CUIT/CUIL</Label>
                                <Input
                                    id="cuit"
                                    value={formData.cuit}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({ ...formData, cuit: val, new_tax_id: val?.trim() ? val : formData.dni })
                                    }}
                                    placeholder="Ej: 27-27841387-5"
                                />
                            </div>
                        </div>

                        {/* Nacionalidad */}
                        <div className="grid grid-cols-2 gap-4">
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
                                <Label htmlFor="fecha_nac">Fecha Nacimiento</Label>
                                <Input
                                    id="fecha_nac"
                                    type="date"
                                    value={formData.fecha_nacimiento}
                                    onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                                />
                                {formData.fecha_nacimiento && (
                                    <span className="text-xs text-muted-foreground">
                                        Formato: {new Date(formData.fecha_nacimiento + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                )}
                            </div>
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

                        {/* Email y Teléfono */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="email@ejemplo.com"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="tel">Teléfono</Label>
                                <Input
                                    id="tel"
                                    value={formData.telefono}
                                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                    placeholder="Cod. Área + Número"
                                />
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <p className="text-sm font-semibold text-indigo-700 mb-4 uppercase tracking-wider">Estado Civil y Filiación</p>

                            {/* Estado Civil */}
                            <div className="grid gap-2 mb-3">
                                <Label htmlFor="estado_civil">Estado Civil (Detalle)</Label>
                                <Input
                                    id="estado_civil"
                                    value={formData.estado_civil}
                                    onChange={(e) => setFormData({ ...formData, estado_civil: e.target.value })}
                                    placeholder="Ej: Casado en primeras nupcias con... / Divorciado de... / Soltero"
                                />
                            </div>

                            {/* Nombres de Padres */}
                            <div className="grid gap-2 mb-3">
                                <Label htmlFor="padres">Filiación (Padres)</Label>
                                <Input
                                    id="padres"
                                    value={formData.nombres_padres}
                                    onChange={(e) => setFormData({ ...formData, nombres_padres: e.target.value })}
                                    placeholder="Hijo de [Padre] y de [Madre]"
                                />
                            </div>

                            {/* Nombre del Cónyuge */}
                            <div className="grid gap-2">
                                <Label htmlFor="conyuge">Cónyuge (Nombre)</Label>
                                <Input
                                    id="conyuge"
                                    value={formData.nombre_conyuge}
                                    onChange={(e) => setFormData({ ...formData, nombre_conyuge: e.target.value })}
                                    placeholder="Si es casado/a"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-4 border-t">
                        <Button type="submit" disabled={loading}>
                            {loading ? "Guardando..." : "Guardar Cambios"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
