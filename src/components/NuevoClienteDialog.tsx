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
import { UserPlus } from "lucide-react";
import { createPersona } from "@/app/actions/personas";
import { toast } from "sonner";

export function NuevoClienteDialog() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nombre_completo: "",
        tax_id: "",
        email: "",
        telefono: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = await createPersona(formData);

        setLoading(false);
        if (res.success) {
            toast.success("Cliente creado correctamente");
            setOpen(false);
            setFormData({ nombre_completo: "", tax_id: "", email: "", telefono: "" });
            // revalidatePath is called in the action, so table should refresh
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
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Crear Nuevo Cliente</DialogTitle>
                        <DialogDescription>
                            Ingrese los datos básicos de la persona. El CUIT/DNI es obligatorio.
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
                            <Label htmlFor="tax_id">CUIT / DNI</Label>
                            <Input
                                id="tax_id"
                                required
                                value={formData.tax_id}
                                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                                placeholder="Sin guiones ni puntos"
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
                            {loading ? "Guardando..." : "Guardar Cliente"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
