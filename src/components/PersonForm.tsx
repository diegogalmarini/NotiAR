"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertPerson } from "@/app/actions/carpeta";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PersonFormProps {
    initialData?: any;
    onSuccess: (person: any) => void;
    onCancel: () => void;
}

export function PersonForm({ initialData, onSuccess, onCancel }: PersonFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        tax_id: initialData?.tax_id || "",
        nombre_completo: initialData?.nombre_completo || "",
        dni: initialData?.dni || "",
        cuit: initialData?.cuit || "",
        nacionalidad: initialData?.nacionalidad || "Argentino/a",
        fecha_nacimiento: initialData?.fecha_nacimiento || "",
        domicilio_real: initialData?.domicilio_real?.literal || "",
        estado: initialData?.estado_civil_detalle || initialData?.estado_civil_detallado?.estado || "",
        padres: initialData?.nombres_padres || initialData?.estado_civil_detallado?.padres || "",
        conyuge: initialData?.datos_conyuge?.nombre || initialData?.estado_civil_detallado?.conyuge || "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                tax_id: formData.tax_id,
                nombre_completo: formData.nombre_completo,
                dni: formData.dni,
                cuit: formData.cuit,
                nacionalidad: formData.nacionalidad,
                fecha_nacimiento: formData.fecha_nacimiento || null,
                domicilio_real: { literal: formData.domicilio_real },
                estado_civil_detalle: formData.estado,
                nombres_padres: formData.padres,
                datos_conyuge: { nombre: formData.conyuge },
                estado_civil_detallado: { // Legacy
                    estado: formData.estado,
                    padres: formData.padres,
                    conyuge: formData.conyuge
                }
            };

            const res = await upsertPerson(payload);
            if (res.success) {
                toast.success("Persona guardada correctamente");
                onSuccess(res.data);
            } else {
                toast.error("Error al guardar: " + res.error);
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>DNI / CUIT (Tax ID)</Label>
                    <Input
                        required
                        value={formData.tax_id}
                        onChange={e => setFormData({ ...formData, tax_id: e.target.value })}
                        placeholder="Ej: 20384445551"
                        disabled={!!initialData}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Nombre Completo</Label>
                    <Input
                        required
                        value={formData.nombre_completo}
                        onChange={e => setFormData({ ...formData, nombre_completo: e.target.value })}
                        placeholder="Nombre y Apellido"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>DNI</Label>
                    <Input
                        value={formData.dni}
                        onChange={e => setFormData({ ...formData, dni: e.target.value })}
                        placeholder="DNI"
                    />
                </div>
                <div className="space-y-2">
                    <Label>CUIT</Label>
                    <Input
                        value={formData.cuit}
                        onChange={e => setFormData({ ...formData, cuit: e.target.value })}
                        placeholder="CUIT"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Nacionalidad</Label>
                    <Input
                        value={formData.nacionalidad}
                        onChange={e => setFormData({ ...formData, nacionalidad: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Fecha Nacimiento</Label>
                    <div className="flex flex-col gap-1">
                        <Input
                            type="date"
                            value={formData.fecha_nacimiento}
                            onChange={e => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                        />
                        {formData.fecha_nacimiento && (
                            <span className="text-xs text-muted-foreground ml-1">
                                Formato: {new Date(formData.fecha_nacimiento + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Domicilio Real</Label>
                <Input
                    value={formData.domicilio_real}
                    onChange={e => setFormData({ ...formData, domicilio_real: e.target.value })}
                    placeholder="Calle, Nro, Ciudad..."
                />
            </div>

            <div className="border-t pt-4 mt-2">
                <p className="text-sm font-bold text-indigo-700 mb-4 uppercase tracking-wider">Estado Civil y Filiación</p>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Estado Civil (Detalle)</Label>
                        <Input
                            value={formData.estado}
                            onChange={e => setFormData({ ...formData, estado: e.target.value })}
                            placeholder="Ej: Casado en primeras nupcias con..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Filiación (Padres)</Label>
                        <Input
                            value={formData.padres}
                            onChange={e => setFormData({ ...formData, padres: e.target.value })}
                            placeholder="Hijo de [Padre] y de [Madre]"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Cónyuge (Nombre)</Label>
                        <Input
                            value={formData.conyuge}
                            onChange={e => setFormData({ ...formData, conyuge: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-6">
                <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {initialData ? "Actualizar" : "Crear Persona"}
                </Button>
            </div>
        </form>
    );
}
