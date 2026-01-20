"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PersonForm } from "@/components/PersonForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit2, Mail, Phone, Calendar, MapPin, User, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function ClientProfile({ persona }: { persona: any }) {
    const [isEditing, setIsEditing] = useState(false);
    const [data, setData] = useState(persona);

    const formatDate = (dateString?: string) => {
        if (!dateString) return "-";
        return new Date(dateString + 'T12:00:00').toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    if (isEditing) {
        return (
            <div className="container mx-auto py-10 max-w-4xl animate-in fade-in zoom-in-95 duration-200">
                <Button variant="ghost" onClick={() => setIsEditing(false)} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver al perfil
                </Button>
                <Card className="shadow-lg border-primary/20">
                    <CardHeader className="bg-slate-50 border-b">
                        <CardTitle className="text-xl text-slate-800">Editar Cliente</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <PersonForm
                            initialData={data}
                            onSuccess={(newData) => {
                                setData(newData);
                                setIsEditing(false);
                            }}
                            onCancel={() => setIsEditing(false)}
                        />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-10 max-w-5xl space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <Button variant="outline" asChild className="hover:bg-slate-100">
                    <Link href="/clientes"><ArrowLeft className="mr-2 h-4 w-4" /> Volver a la lista</Link>
                </Button>
                <Button onClick={() => setIsEditing(true)} className="shadow-md bg-indigo-600 hover:bg-indigo-700">
                    <Edit2 className="mr-2 h-4 w-4" /> Editar Cliente
                </Button>
            </div>

            <Card className="shadow-xl overflow-hidden border-t-4 border-t-indigo-500">
                <CardHeader className="bg-slate-50/50 pb-8 pt-8">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{data.nombre_completo}</h1>
                            <div className="flex items-center gap-2 mt-2 text-slate-500">
                                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-sm text-slate-600 border border-slate-200">
                                    {data.tax_id}
                                </span>
                                {data.nacionalidad && (
                                    <Badge variant="outline" className="text-slate-600 bg-white">
                                        {data.nacionalidad}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">

                    {/* Identificación y Contacto */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="flex items-center text-sm font-semibold text-indigo-600 mb-3 uppercase tracking-wider">
                                <User className="mr-2 h-4 w-4" /> Identificación
                            </h3>
                            <div className="bg-slate-50 p-4 rounded-lg space-y-3 border border-slate-100">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase">DNI</p>
                                        <p className="font-medium text-slate-900">{data.dni || "-"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase">CUIT</p>
                                        <p className="font-medium text-slate-900">{data.cuit || "-"}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Fecha de Nacimiento</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Calendar className="h-3 w-3 text-slate-400" />
                                        <p className="font-medium text-slate-900">{formatDate(data.fecha_nacimiento)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="flex items-center text-sm font-semibold text-indigo-600 mb-3 uppercase tracking-wider">
                                <Mail className="mr-2 h-4 w-4" /> Contacto
                            </h3>
                            <div className="bg-slate-50 p-4 rounded-lg space-y-3 border border-slate-100">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Email</p>
                                    <p className="font-medium text-slate-900 break-all">{data.contacto?.email || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Teléfono</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Phone className="h-3 w-3 text-slate-400" />
                                        <p className="font-medium text-slate-900">{data.contacto?.telefono || "-"}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Domicilio Real</p>
                                    <div className="flex items-start gap-2 mt-1">
                                        <MapPin className="h-3 w-3 text-slate-400 mt-1" />
                                        <p className="font-medium text-slate-900">{data.domicilio_real?.literal || "-"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Estado Civil y Filiación */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="flex items-center text-sm font-semibold text-indigo-600 mb-3 uppercase tracking-wider">
                                <Users className="mr-2 h-4 w-4" /> Estado Civil y Filiación
                            </h3>
                            <div className="bg-slate-50 p-4 rounded-lg space-y-4 border border-slate-100">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Estado Civil</p>
                                    <p className="font-medium text-slate-900">{data.estado_civil_detalle || data.estado_civil_detallado?.estado || "-"}</p>
                                </div>
                                {data.datos_conyuge?.nombre && (
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase">Conyuge</p>
                                        <p className="font-medium text-slate-900">{data.datos_conyuge.nombre}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Padres</p>
                                    <p className="font-medium text-slate-900">{data.nombres_padres || data.estado_civil_detallado?.padres || "-"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
