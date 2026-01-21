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
import { UserPlus, Loader2 } from "lucide-react";
import { createPersona } from "@/app/actions/personas";
import { toast } from "sonner";

export function NuevoClienteDialog() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [nombres, setNombres] = useState("");
    const [apellidos, setApellidos] = useState("");

    const [formData, setFormData] = useState({
        nombre_completo: "",
        dni: "",
        cuit: "",
        tax_id: "",
        nacionalidad: "Argentina",
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

        const fullData = {
            ...formData,
            nombre_completo: `${nombres} ${apellidos}`.trim()
        };

        const res = await createPersona(fullData);

        setLoading(false);
        if (res.success) {
            toast.success("Cliente creado correctamente");
            setOpen(false);
            setNombres("");
            setApellidos("");
            setFormData({
                nombre_completo: "",
                dni: "",
                cuit: "",
                tax_id: "",
                nacionalidad: "Argentina",
                fecha_nacimiento: "",
                domicilio: "",
                email: "",
                telefono: "",
                estado_civil: "",
                nombres_padres: "",
                nombre_conyuge: ""
            });
            router.push(`/clientes`);
        } else {
            toast.error(res.error || "Error al crear cliente");
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) {
                setNombres("");
                setApellidos("");
            }
        }}>
            <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-100 flex items-center gap-2">
                    <UserPlus size={18} />
                    <span>Nuevo Cliente</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                <div className="p-8 bg-white overflow-y-auto">
                    <DialogHeader className="mb-8">
                        <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl shadow-inner">
                                <UserPlus size={26} />
                            </div>
                            Nuevo Cliente
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 text-base">
                            Ingrese los datos básicos del cliente. Los campos con **(*)** son obligatorios.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} id="nuevo-cliente-form" className="space-y-6">
                        {/* Nombre y Apellido */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="nombre" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Nombres *</Label>
                                <Input
                                    id="nombre"
                                    required
                                    value={nombres}
                                    onChange={(e) => setNombres(e.target.value)}
                                    placeholder="Ej: Juan Ignacio"
                                    className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all font-medium"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="apellido" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Apellidos *</Label>
                                <Input
                                    id="apellido"
                                    required
                                    value={apellidos}
                                    onChange={(e) => setApellidos(e.target.value)}
                                    placeholder="Ej: Pérez García"
                                    className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all font-medium"
                                />
                            </div>
                        </div>

                        {/* DNI y CUIT */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="dni" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">DNI (Opcional)</Label>
                                <Input
                                    id="dni"
                                    value={formData.dni}
                                    onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                                    placeholder="Ej: 27.841.387"
                                    className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="cuit" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">CUIT/CUIL (Opcional)</Label>
                                <Input
                                    id="cuit"
                                    value={formData.cuit}
                                    onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                                    placeholder="Ej: 27-27841387-5"
                                    className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all"
                                />
                            </div>
                        </div>

                        {/* Nacionalidad y Fecha de Nacimiento */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="nacionalidad" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Nacionalidad</Label>
                                <Input
                                    id="nacionalidad"
                                    value={formData.nacionalidad}
                                    onChange={(e) => setFormData({ ...formData, nacionalidad: e.target.value })}
                                    placeholder="Ej: Argentina"
                                    className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="fecha_nac" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Fecha Nacimiento</Label>
                                <Input
                                    id="fecha_nac"
                                    type="date"
                                    value={formData.fecha_nacimiento}
                                    onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                                    className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all"
                                />
                            </div>
                        </div>

                        {/* Domicilio Real */}
                        <div className="grid gap-2">
                            <Label htmlFor="domicilio" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Domicilio Real (Opcional)</Label>
                            <Textarea
                                id="domicilio"
                                value={formData.domicilio}
                                onChange={(e) => setFormData({ ...formData, domicilio: e.target.value })}
                                placeholder="Dirección completa: calle, número, localidad, provincia"
                                rows={2}
                                className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all resize-none"
                            />
                        </div>

                        {/* Email y Teléfono */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Email (Opcional)</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="email@ejemplo.com"
                                    className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="tel" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Teléfono (Opcional)</Label>
                                <Input
                                    id="tel"
                                    value={formData.telefono}
                                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                    placeholder="Cod. Área + Número"
                                    className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all"
                                />
                            </div>
                        </div>

                        {/* Estado Civil y Filiación */}
                        <div className="pt-6 border-t border-slate-100">
                            <p className="text-[10px] font-black text-indigo-500 mb-6 uppercase tracking-[0.3em]">Estado Civil y Filiación</p>

                            <div className="grid gap-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="estado_civil" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Estado Civil (Detalle)</Label>
                                    <Input
                                        id="estado_civil"
                                        value={formData.estado_civil}
                                        onChange={(e) => setFormData({ ...formData, estado_civil: e.target.value })}
                                        placeholder="Ej: Casado en primeras nupcias con..."
                                        className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="padres" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Filiación (Padres)</Label>
                                        <Input
                                            id="padres"
                                            value={formData.nombres_padres}
                                            onChange={(e) => setFormData({ ...formData, nombres_padres: e.target.value })}
                                            placeholder="Hijo de [Padre] y de [Madre]"
                                            className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all"
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="conyuge" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Cónyuge (Nombre)</Label>
                                        <Input
                                            id="conyuge"
                                            value={formData.nombre_conyuge}
                                            onChange={(e) => setFormData({ ...formData, nombre_conyuge: e.target.value })}
                                            placeholder="Si aplica"
                                            className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="px-8 py-5 bg-slate-50/80 backdrop-blur-sm border-t border-slate-100 flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setOpen(false)}
                        disabled={loading}
                        className="rounded-xl text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="nuevo-cliente-form"
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[160px] h-12 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-95"
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar Cliente"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
