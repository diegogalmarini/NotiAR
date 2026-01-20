"use client";

import { useRouter } from "next/navigation";
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
import { UserPlus } from "lucide-react";
import { createPersona } from "@/app/actions/personas";
import { toast } from "sonner";

export function NuevoClienteDialog() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nombre_completo: "",
        dni: "",
        cuit: "",
        tax_id: "",
        nacionalidad: "",
        fecha_nacimiento: "",
        domicilio: "",
        email: "",
        telefono: "",
        estado_civil: "",
        nombres_padres: "",
        nombre_conyuge: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = await createPersona(formData);

        setLoading(false);
        if (res.success) {
            toast.success("Cliente creado correctamente");
            setOpen(false);
            setFormData({
                nombre_completo: "",
                dni: "",
                cuit: "",
                tax_id: "",
                nacionalidad: "",
                fecha_nacimiento: "",
                domicilio: "",
                email: "",
                telefono: "",
                estado_civil: "",
                nombres_padres: "",
                nombre_conyuge: ""
            });
            router.push(`/clientes`); // Redirect to list as specific pages might not exist yet for temp IDs
        } else {
            toast.error(res.error || "Error al crear cliente");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Nuevo Cliente
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Crear Nuevo Cliente</DialogTitle>
                    <DialogDescription>
                        Ingrese los datos básicos de la persona. Nombre es obligatorio; el resto podrá ser completado por el cliente mediante el link de la Ficha.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="grid gap-4 py-4 overflow-y-auto pr-2">
                        {/* Nombre y Apellido */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="nombre">Nombre *</Label>
                                <Input
                                    id="nombre"
                                    required
                                    value={formData.nombre_completo.split(" ").slice(0, -1).join(" ")}
                                    onChange={(e) => {
                                        const apellido = formData.nombre_completo.split(" ").slice(-1).join(" ");
                                        setFormData({ ...formData, nombre_completo: e.target.value + " " + apellido })
                                    }}
                                    placeholder="Nombres"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="apellido">Apellido *</Label>
                                <Input
                                    id="apellido"
                                    required
                                    value={formData.nombre_completo.split(" ").slice(-1)[0]}
                                    onChange={(e) => {
                                        const nombre = formData.nombre_completo.split(" ").slice(0, -1).join(" ");
                                        setFormData({ ...formData, nombre_completo: nombre + " " + e.target.value })
                                    }}
                                    placeholder="Apellidos"
                                />
                            </div>
                        </div>

                        {/* DNI y CUIT */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="dni">DNI (Opcional)</Label>
                                <Input
                                    id="dni"
                                    value={formData.dni}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({ ...formData, dni: val })
                                    }}
                                    placeholder="Ej: 27.841.387"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="cuit">CUIT/CUIL (Opcional)</Label>
                                <Input
                                    id="cuit"
                                    value={formData.cuit}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({ ...formData, cuit: val })
                                    }}
                                    placeholder="Ej: 27-27841387-5"
                                />
                            </div>
                        </div>

                        {/* Nacionalidad y Fecha de Nacimiento */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="nacionalidad">Nacionalidad</Label>
                                <Input
                                    id="nacionalidad"
                                    value={formData.nacionalidad}
                                    onChange={(e) => setFormData({ ...formData, nacionalidad: e.target.value })}
                                    placeholder="Ej: Argentina"
                                />
                            </div>
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
                                        {new Date(formData.fecha_nacimiento + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Domicilio Real */}
                        <div className="grid gap-2">
                            <Label htmlFor="domicilio">Domicilio Real (Opcional)</Label>
                            <Textarea
                                id="domicilio"
                                value={formData.domicilio}
                                onChange={(e) => setFormData({ ...formData, domicilio: e.target.value })}
                                placeholder="Dirección completa: calle, número, localidad, provincia"
                                rows={2}
                            />
                        </div>

                        {/* Email y Teléfono */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email (Opcional)</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="email@ejemplo.com"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="tel">Teléfono (Opcional)</Label>
                                <Input
                                    id="tel"
                                    value={formData.telefono}
                                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                    placeholder="Cod. Área + Número"
                                />
                            </div>
                        </div>

                        {/* Estado Civil y Filiación */}
                        <div className="border-t pt-4">
                            <p className="text-sm font-semibold text-indigo-700 mb-4 uppercase tracking-wider">Estado Civil y Filiación (Opcional)</p>

                            <div className="grid gap-2 mb-3">
                                <Label htmlFor="estado_civil">Estado Civil (Detalle)</Label>
                                <Input
                                    id="estado_civil"
                                    value={formData.estado_civil}
                                    onChange={(e) => setFormData({ ...formData, estado_civil: e.target.value })}
                                    placeholder="Ej: Casado en primeras nupcias con... / Divorciado de... / Soltero"
                                />
                            </div>

                            <div className="grid gap-2 mb-3">
                                <Label htmlFor="padres">Filiación (Padres)</Label>
                                <Input
                                    id="padres"
                                    value={formData.nombres_padres}
                                    onChange={(e) => setFormData({ ...formData, nombres_padres: e.target.value })}
                                    placeholder="Hijo de [Padre] y de [Madre]"
                                />
                            </div>

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
                            {loading ? "Guardando..." : "Guardar Cliente"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
