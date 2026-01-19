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
import { Home } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function NuevoInmuebleDialog() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        partida: "",
        nomenclatura: "",
        descripcion: ""
    });
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase
            .from("inmuebles")
            .insert([formData]);

        setLoading(false);
        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Inmueble creado");
            setOpen(false);
            setFormData({ partida: "", nomenclatura: "", descripcion: "" });
            router.refresh();
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Home className="mr-2 h-4 w-4" />
                    Nuevo Inmueble
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Registrar Nuevo Inmueble</DialogTitle>
                        <DialogDescription>
                            Ingrese los datos catastrales del inmueble.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="partida">Número de Partida</Label>
                            <Input
                                id="partida"
                                required
                                value={formData.partida}
                                onChange={(e) => setFormData({ ...formData, partida: e.target.value })}
                                placeholder="Ej: 052-123456"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="nomenclatura">Nomenclatura Catastral</Label>
                            <Input
                                id="nomenclatura"
                                value={formData.nomenclatura}
                                onChange={(e) => setFormData({ ...formData, nomenclatura: e.target.value })}
                                placeholder="Circ. I, Secc. A, Manz. 10..."
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="descripcion">Descripción / Ubicación</Label>
                            <Input
                                id="descripcion"
                                value={formData.descripcion}
                                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                placeholder="Ej: Calle 123, 4to B"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Guardando..." : "Guardar Inmueble"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
