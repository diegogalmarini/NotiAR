"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { submitFichaData } from "@/app/actions/fichas";
import { toast } from "sonner";
import { FileText, User, MapPin, Phone, Mail, CheckCircle2 } from "lucide-react";

export function FichaForm({ tokenData }: { tokenData: any }) {
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const persona = tokenData.personas;

    const [formData, setFormData] = useState({
        nombre_completo: persona.nombre_completo || "",
        dni: (persona.dni?.startsWith("SIN-DNI-") ? "" : persona.dni) || "",
        cuit: persona.cuit || "",
        nacionalidad: persona.nacionalidad || "Argentina",
        fecha_nacimiento: persona.fecha_nacimiento || "",
        domicilio: persona.domicilio_real?.literal || "",
        nombres_padres: persona.nombres_padres || "",
        estado_civil: persona.estado_civil_detalle || "",
        email: persona.contacto?.email || "",
        telefono: persona.contacto?.telefono || ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = await submitFichaData(tokenData.id, persona.dni, formData);

        setLoading(false);
        if (res.success) {
            setSubmitted(true);
            toast.success("¡Datos enviados correctamente!");
        } else {
            toast.error(res.error || "Error al enviar los datos");
        }
    };

    if (submitted) {
        return (
            <Card className="max-w-md mx-auto mt-12 text-center p-8 border-t-4 border-t-green-500">
                <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
                <CardTitle className="text-2xl mb-2">¡Muchas Gracias!</CardTitle>
                <CardDescription className="text-lg">
                    Tus datos han sido recibidos correctamente por el sistema NotiAR.
                    Ya puedes cerrar esta ventana.
                </CardDescription>
            </Card>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-full mb-4">
                    <FileText className="h-8 w-8 text-blue-600" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900">Ficha de Datos Personales</h1>
                <p className="text-slate-500 mt-2">Por favor, completa o verifica tus datos para la confección del trámite.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card className="shadow-lg border-slate-200 overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-blue-500" />
                            <CardTitle className="text-lg">Identificación y Datos Personales</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-4 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre</Label>
                                <Input
                                    id="nombre"
                                    required
                                    value={formData.nombre_completo.split(" ").slice(0, -1).join(" ")}
                                    onChange={e => {
                                        const apellido = formData.nombre_completo.split(" ").slice(-1).join(" ");
                                        setFormData({ ...formData, nombre_completo: e.target.value + " " + apellido })
                                    }}
                                    placeholder="Nombres"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="apellido">Apellido</Label>
                                <Input
                                    id="apellido"
                                    required
                                    value={formData.nombre_completo.split(" ").slice(-1)[0]}
                                    onChange={e => {
                                        const nombre = formData.nombre_completo.split(" ").slice(0, -1).join(" ");
                                        setFormData({ ...formData, nombre_completo: nombre + " " + e.target.value })
                                    }}
                                    placeholder="Apellidos"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="dni">DNI</Label>
                                <Input
                                    id="dni"
                                    required
                                    value={formData.dni}
                                    onChange={e => setFormData({ ...formData, dni: e.target.value })}
                                    placeholder="Ej: 27841387"
                                    className="font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cuit">CUIT / CUIL</Label>
                                <Input
                                    id="cuit"
                                    value={formData.cuit}
                                    onChange={e => setFormData({ ...formData, cuit: e.target.value })}
                                    placeholder="Ej: 27-27841387-5"
                                    className="font-mono"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="nac">Nacionalidad</Label>
                                <Input
                                    id="nac"
                                    required
                                    value={formData.nacionalidad}
                                    onChange={e => setFormData({ ...formData, nacionalidad: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="birth">Fecha de Nacimiento</Label>
                                <Input
                                    id="birth"
                                    type="date"
                                    required
                                    value={formData.fecha_nacimiento}
                                    onChange={e => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="civil">Estado Civil y Detalles</Label>
                            <Input
                                id="civil"
                                required
                                placeholder="Ej: Soltero, Casado en 1ras nupcias con..."
                                value={formData.estado_civil}
                                onChange={e => setFormData({ ...formData, estado_civil: e.target.value })}
                            />
                            <p className="text-[10px] text-slate-400">Si es divorciado o viudo, mencione con quién.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="padres">Nombres de los Padres (Filiación)</Label>
                            <Input
                                id="padres"
                                placeholder="Nombres completos de Padre y Madre"
                                value={formData.nombres_padres}
                                onChange={e => setFormData({ ...formData, nombres_padres: e.target.value })}
                            />
                            <p className="text-[10px] text-slate-400">Obligatorio si su estado civil es soltero/a.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-lg border-slate-200 overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-red-500" />
                            <CardTitle className="text-lg">Domicilio y Contacto</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-4 pt-6">
                        <div className="space-y-2">
                            <Label htmlFor="dom">Domicilio Real</Label>
                            <Input
                                id="dom"
                                required
                                value={formData.domicilio}
                                onChange={e => setFormData({ ...formData, domicilio: e.target.value })}
                                placeholder="Calle, número, localidad"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="tel" className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> Teléfono
                                </Label>
                                <Input
                                    id="tel"
                                    required
                                    type="tel"
                                    value={formData.telefono}
                                    onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                                    placeholder="Ej: 291 1234567"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mail" className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" /> Correo Electrónico
                                </Label>
                                <Input
                                    id="mail"
                                    required
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="nombre@ejemplo.com"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="pb-12">
                    <Button type="submit" className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95" disabled={loading}>
                        {loading ? "Enviando..." : "Confirmar y Enviar Datos"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
