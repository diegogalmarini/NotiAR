"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { upsertPerson } from "@/app/actions/carpeta";
import { updatePersona } from "@/app/actions/personas";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { formatDateInstructions } from "@/lib/utils";

interface PersonFormProps {
    initialData?: any;
    onSuccess: (person: any) => void;
    onCancel: () => void;
}

export function PersonForm({ initialData, onSuccess, onCancel }: PersonFormProps) {
    const [loading, setLoading] = useState(false);
    const [tipoPersona, setTipoPersona] = useState(
        initialData?.tipo_persona === 'JURIDICA' ||
            ['30', '33', '34'].some((p: string) => initialData?.cuit?.startsWith(p))
            ? 'JURIDICA' : 'FISICA'
    );

    const [formData, setFormData] = useState({
        nombre_completo: initialData?.nombre_completo || "",
        dni: initialData?.dni || "",
        cuit: initialData?.cuit || "",
        nacionalidad: initialData?.nacionalidad || "Argentino/a",
        fecha_nacimiento: initialData?.fecha_nacimiento || "",
        domicilio_real: initialData?.domicilio_real?.literal || "",
        estado: initialData?.estado_civil_detalle || initialData?.estado_civil_detallado?.estado || "",
        padres: initialData?.nombres_padres || initialData?.estado_civil_detallado?.padres || "",
        conyuge: initialData?.datos_conyuge?.nombre || initialData?.estado_civil_detallado?.conyuge || "",
        email: initialData?.contacto?.email || "",
        telefono: initialData?.contacto?.telefono || "",
    });

    // Auto-switch type based on CUIT input
    // Auto-switch type based on CUIT input
    const handleCuitChange = (val: string) => {
        // Strip non-digits checks
        const cleanVal = val.replace(/\D/g, '');

        // Auto-format for display: XX-XXXXXXXX-X
        let formatted = cleanVal;
        if (cleanVal.length > 2) formatted = `${cleanVal.slice(0, 2)}-${cleanVal.slice(2)}`;
        if (cleanVal.length > 10) formatted = `${cleanVal.slice(0, 2)}-${cleanVal.slice(2, 10)}-${cleanVal.slice(10, 11)}`;

        setFormData({ ...formData, cuit: formatted });

        // Robust check for Legal Entity prefix
        if (['30', '33', '34'].some(p => cleanVal.startsWith(p))) {
            setTipoPersona('JURIDICA');
        } else if (['20', '23', '27'].some(p => cleanVal.startsWith(p))) {
            setTipoPersona('FISICA');
        }
    };

    // Initial check on mount
    useEffect(() => {
        if (initialData?.cuit) {
            const cleanCuit = initialData.cuit.toString().replace(/\D/g, '');
            if (['30', '33', '34'].some((p: string) => cleanCuit.startsWith(p))) {
                setTipoPersona('JURIDICA');
            }
        }
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Clean up unrelated fields if Juridica
            let finalData = { ...formData };
            if (tipoPersona === 'JURIDICA') {
                finalData.fecha_nacimiento = "";
                finalData.nacionalidad = "";
                finalData.estado = "";
                finalData.padres = "";
                finalData.conyuge = "";
            }

            const payloadCommon = {
                nombre_completo: finalData.nombre_completo,
                cuit: finalData.cuit,
                domicilio_real: { literal: finalData.domicilio_real },
                contacto: {
                    email: finalData.email,
                    telefono: finalData.telefono
                },
                tipo_persona: tipoPersona // Ensure backend handles this if possible
            };

            if (initialData) {
                const updatePayload: any = {
                    ...payloadCommon,
                    domicilio: finalData.domicilio_real, // adapter for updatePersona
                    dni: finalData.dni
                };

                // Add specifics only check if FISICA
                if (tipoPersona === 'FISICA') {
                    updatePayload.nacionalidad = finalData.nacionalidad;
                    updatePayload.fecha_nacimiento = finalData.fecha_nacimiento;
                    updatePayload.estado_civil = finalData.estado;
                    updatePayload.nombres_padres = finalData.padres;
                    updatePayload.nombre_conyuge = finalData.conyuge;
                }

                const res = await updatePersona(initialData.dni || initialData.cuit, updatePayload); // CUIT fallback as ID
                if (res.success) {
                    toast.success("Persona actualizada correctamente");
                    onSuccess(res.data);
                } else {
                    toast.error("Error al actualizar: " + res.error);
                }
            } else {
                const createPayload: any = {
                    ...payloadCommon,
                    dni: finalData.dni,
                    estado_civil_detalle: finalData.estado, // Legacy structure
                    nombres_padres: finalData.padres,
                    datos_conyuge: { nombre: finalData.conyuge },
                    nacionalidad: finalData.nacionalidad,
                    fecha_nacimiento: finalData.fecha_nacimiento || null
                };

                const res = await upsertPerson(createPayload);
                if (res.success) {
                    toast.success("Persona guardada correctamente");
                    onSuccess(res.data);
                } else {
                    toast.error("Error al guardar: " + res.error);
                }
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };


    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="flex gap-4 p-1 bg-slate-100/50 rounded-lg justify-center mb-4">
                <Button
                    type="button"
                    variant={tipoPersona === 'FISICA' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setTipoPersona('FISICA')}
                    className="w-1/2"
                >
                    Persona Física
                </Button>
                <Button
                    type="button"
                    variant={tipoPersona === 'JURIDICA' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setTipoPersona('JURIDICA')}
                    className="w-1/2"
                >
                    Persona Jurídica
                </Button>
            </div>

            {tipoPersona === 'FISICA' ? (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Nombre</Label>
                        <Input
                            required
                            value={formData.nombre_completo.split(" ").slice(0, -1).join(" ")}
                            onChange={(e) => {
                                const apellido = formData.nombre_completo.split(" ").slice(-1).join(" ");
                                setFormData({ ...formData, nombre_completo: e.target.value + " " + apellido })
                            }}
                            placeholder="Nombres"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Apellido</Label>
                        <Input
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
            ) : (
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        Razón Social
                        <span className="text-[10px] text-muted-foreground font-normal">(Nombre de la Entidad / Sociedad)</span>
                    </Label>
                    <Input
                        required
                        value={formData.nombre_completo}
                        onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                        placeholder="Ej: BANCO DE GALICIA Y BUENOS AIRES S.A.U."
                        className="font-bold"
                    />
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                {tipoPersona === 'FISICA' && (
                    <div className="space-y-2">
                        <Label>DNI</Label>
                        <Input
                            value={formData.dni}
                            onChange={e => setFormData({ ...formData, dni: e.target.value })}
                            placeholder="DNI"
                        />
                    </div>
                )}
                <div className={tipoPersona === 'JURIDICA' ? "col-span-2 space-y-2" : "space-y-2"}>
                    <Label>CUIT / CUIL</Label>
                    <Input
                        value={formData.cuit}
                        onChange={e => handleCuitChange(e.target.value)}
                        placeholder="CUIT (Sin guiones)"
                    />
                    {tipoPersona === 'JURIDICA' && (
                        <p className="text-[10px] text-muted-foreground">
                            El CUIT es el identificador principal para Personas Jurídicas.
                        </p>
                    )}
                </div>
            </div>

            {tipoPersona === 'FISICA' && (
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
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <Label>{tipoPersona === 'JURIDICA' ? 'Domicilio Legal / Fiscal' : 'Domicilio Real'}</Label>
                <Input
                    value={formData.domicilio_real}
                    onChange={e => setFormData({ ...formData, domicilio_real: e.target.value })}
                    placeholder="Calle, Nro, Ciudad..."
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email@ejemplo.com"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                        type="tel"
                        value={formData.telefono}
                        onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                        placeholder="Cod. Área + Número"
                    />
                </div>
            </div>

            {tipoPersona === 'FISICA' && (
                <div className="border-t pt-4 mt-2">
                    <p className="text-sm font-bold text-indigo-700 mb-4 uppercase tracking-wider">Estado Civil y Filiación</p>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Estado Civil (Detalle)</Label>
                            <Textarea
                                rows={3}
                                value={formData.estado}
                                onChange={e => setFormData({ ...formData, estado: e.target.value })}
                                placeholder="Ej: Casado en primeras nupcias con..."
                                className="resize-none"
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
            )}

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
