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
import { UserPlus, Loader2, AlertCircle } from "lucide-react";
import { createPersona } from "@/app/actions/personas";
import { toast } from "sonner";
import { isValidCUIT, cn } from "@/lib/utils";

export function NuevoClienteDialog() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [cuitError, setCuitError] = useState(false);
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

        // CUIT Validation
        if (formData.cuit && !isValidCUIT(formData.cuit)) {
            setCuitError(true);
            toast.error("El CUIT/CUIL ingresado no es válido");
            return;
        }

        setCuitError(false);
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
                <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm flex items-center gap-2">
                    <UserPlus size={18} />
                    <span>Nuevo Cliente</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden border border-slate-200 shadow-xl rounded-xl bg-white">
                <div className="p-8 bg-white overflow-y-auto">
                    <DialogHeader className="mb-8">
                        <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-3 text-slate-900">
                            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                                <UserPlus size={22} />
                            </div>
                            Nuevo Cliente
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 text-sm">
                            Ingrese los datos completos del cliente. Todos los campos son obligatorios según requerimiento notarial.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} id="nuevo-cliente-form" className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="nombre" className="text-xs font-semibold text-slate-600 ml-1">Nombres</Label>
                                <Input
                                    id="nombre"
                                    required
                                    value={nombres}
                                    onChange={(e) => setNombres(e.target.value)}
                                    placeholder="Ej: Juan Ignacio"
                                    className="h-11 rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="apellido" className="text-xs font-semibold text-slate-600 ml-1">Apellidos</Label>
                                <Input
                                    id="apellido"
                                    required
                                    value={apellidos}
                                    onChange={(e) => setApellidos(e.target.value)}
                                    placeholder="Ej: Pérez García"
                                    className="h-11 rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>
                        </div>

                        {/* DNI y CUIT */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="dni" className="text-xs font-semibold text-slate-600 ml-1">DNI</Label>
                                <Input
                                    id="dni"
                                    required
                                    value={formData.dni}
                                    onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                                    placeholder="Ej: 27.841.387"
                                    className="h-11 rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="cuit" className={cn("text-xs font-semibold ml-1", cuitError ? "text-red-500" : "text-slate-600")}>
                                    CUIT/CUIL
                                </Label>
                                <Input
                                    id="cuit"
                                    required
                                    value={formData.cuit}
                                    onChange={(e) => {
                                        setFormData({ ...formData, cuit: e.target.value });
                                        if (cuitError) setCuitError(false);
                                    }}
                                    placeholder="Ej: 27-27841387-5"
                                    className={cn(
                                        "h-11 rounded-xl border-slate-200 bg-white focus:ring-2 transition-all",
                                        cuitError ? "border-red-500 focus:ring-red-500/10" : "focus:ring-indigo-500/10"
                                    )}
                                />
                                {cuitError && <p className="text-[10px] text-red-500 font-bold ml-1">CUIT inválido. Por favor revisa los números.</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="nacionalidad" className="text-xs font-semibold text-slate-600 ml-1">Nacionalidad</Label>
                                <Input
                                    id="nacionalidad"
                                    required
                                    value={formData.nacionalidad}
                                    onChange={(e) => setFormData({ ...formData, nacionalidad: e.target.value })}
                                    placeholder="Ej: Argentina"
                                    className="h-11 rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="fecha_nac" className="text-xs font-semibold text-slate-600 ml-1">Fecha Nacimiento</Label>
                                <Input
                                    id="fecha_nac"
                                    type="date"
                                    required
                                    value={formData.fecha_nacimiento}
                                    onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                                    className="h-11 rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="domicilio" className="text-xs font-semibold text-slate-600 ml-1">Domicilio Real</Label>
                            <Textarea
                                id="domicilio"
                                required
                                value={formData.domicilio}
                                onChange={(e) => setFormData({ ...formData, domicilio: e.target.value })}
                                placeholder="Dirección completa: calle, número, localidad, provincia"
                                rows={2}
                                className="rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-xs font-semibold text-slate-600 ml-1">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="email@ejemplo.com"
                                    className="h-11 rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="tel" className="text-xs font-semibold text-slate-600 ml-1">Teléfono</Label>
                                <Input
                                    id="tel"
                                    required
                                    value={formData.telefono}
                                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                    placeholder="Cod. Área + Número"
                                    className="h-11 rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>
                        </div>

                        {/* Estado Civil y Filiación */}
                        <div className="pt-6 border-t border-slate-100">
                            <p className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider">Estado Civil y Filiación</p>

                            <div className="grid gap-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="estado_civil" className="text-xs font-semibold text-slate-600 ml-1">Estado Civil (Detalle)</Label>
                                    <Input
                                        id="estado_civil"
                                        required
                                        value={formData.estado_civil}
                                        onChange={(e) => setFormData({ ...formData, estado_civil: e.target.value })}
                                        placeholder="Ej: Casado en primeras nupcias con..."
                                        className="h-11 rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="padres" className="text-xs font-semibold text-slate-600 ml-1">
                                            Filiación (Padres) {formData.estado_civil?.toLowerCase().includes("solter") && "*"}
                                        </Label>
                                        <Input
                                            id="padres"
                                            required={formData.estado_civil?.toLowerCase().includes("solter")}
                                            value={formData.nombres_padres}
                                            onChange={(e) => setFormData({ ...formData, nombres_padres: e.target.value })}
                                            placeholder="Hijo de [Padre] y de [Madre]"
                                            className="h-11 rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="conyuge" className="text-xs font-semibold text-slate-600 ml-1">Cónyuge (Nombre)</Label>
                                        <Input
                                            id="conyuge"
                                            value={formData.nombre_conyuge}
                                            onChange={(e) => setFormData({ ...formData, nombre_conyuge: e.target.value })}
                                            placeholder="Si aplica"
                                            className="h-11 rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setOpen(false)}
                        disabled={loading}
                        className="rounded-xl text-slate-500 font-semibold"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="nuevo-cliente-form"
                        disabled={loading}
                        className="bg-slate-900 hover:bg-slate-800 text-white min-w-[140px] h-11 rounded-lg font-semibold shadow-sm transition-all"
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar Cliente"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
