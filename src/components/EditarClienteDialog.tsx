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
import { Edit2 } from "lucide-react";
import { updatePersona } from "@/app/actions/personas";
import { toast } from "sonner";

interface Persona {
    tax_id: string;
    nombre_completo: string;
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
        email: persona.contacto?.email || "",
        telefono: persona.contacto?.telefono || ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = await updatePersona(persona.tax_id, formData);

        setLoading(false);
        if (res.success) {
            toast.success("Cliente actualizado correctamente");
            setOpen(false);
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
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Editar Cliente</DialogTitle>
                        <DialogDescription>
                            Modifique los datos del cliente. El CUIT/DNI ({persona.tax_id}) no se puede cambiar.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="nombre">Nombre Completo</Label>
                            <Input
                                id="nombre"
                                required
                                value={formData.nombre_completo}
                                onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                                placeholder="Ej: Juan Pérez"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email (Opcional)</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="juan@ejemplo.com"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="tel">Teléfono (Opcional)</Label>
                            <Input
                                id="tel"
                                value={formData.telefono}
                                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                placeholder="Ej: 11 1234-5678"
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
