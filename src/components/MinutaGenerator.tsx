"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { exportMinutaToDocx } from "@/lib/exportMinuta";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function MinutaGenerator({ data, isBlocked }: { data: any; isBlocked?: boolean }) {
    if (!data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Minuta Rogatoria</CardTitle>
                    <CardDescription>Selecciona una escritura para generar la minuta</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const handleExport = async () => {
        if (isBlocked) {
            toast.error("BLOQUEO DE SEGURIDAD: Corrija las discrepancias de identidad antes de exportar.");
            return;
        }
        try {
            await exportMinutaToDocx(data);
            toast.success("Minuta exportada correctamente");
        } catch (error) {
            toast.error("Error al exportar la minuta");
            console.error(error);
        }
    };

    return (
        <Card className="h-fit">
            <CardHeader className="border-b bg-slate-50">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Minuta Rogatoria</CardTitle>
                        <CardDescription>Resumen para el Registro de la Propiedad</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <FileText className="h-3 w-3 mr-1" />
                        RPP
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                {/* Datos del Inmueble */}
                <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-slate-600 uppercase tracking-wider">Inmueble</h3>
                    <div className="rounded-lg border bg-white p-4 space-y-2">
                        {data.inmuebles ? (
                            <>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Partido:</span>
                                    <span className="font-medium">{data.inmuebles.partido_id}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Nro. Partida:</span>
                                    <span className="font-medium">{data.inmuebles.nro_partida}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Ubicación:</span>
                                    <span className="font-medium text-right">{data.inmuebles.domicilio_real || "N/A"}</span>
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">No hay inmueble vinculado</p>
                        )}
                    </div>
                </div>

                {/* Datos de la Operación */}
                <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-slate-600 uppercase tracking-wider">Operación</h3>
                    <div className="rounded-lg border bg-white p-4 space-y-2">
                        {data.operaciones && data.operaciones.length > 0 ? (
                            <>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Acto:</span>
                                    <span className="font-medium">{data.operaciones[0].tipo_acto}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Monto:</span>
                                    <span className="font-medium">${data.operaciones[0].monto_operacion || "0.00"}</span>
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">No hay operaciones registradas</p>
                        )}
                    </div>
                </div>

                {/* Protocolo */}
                <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-slate-600 uppercase tracking-wider">Protocolo</h3>
                    <div className="rounded-lg border bg-white p-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Número:</span>
                            <span className="font-medium">{data.nro_protocolo || "Por asignar"}</span>
                        </div>
                    </div>
                </div>

                {/* Export Button */}
                <Button
                    onClick={handleExport}
                    className={cn("w-full transition-all", isBlocked ? "bg-slate-400 hover:bg-slate-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700")}
                    variant={isBlocked ? "secondary" : "default"}
                    disabled={isBlocked}
                >
                    {isBlocked ? (
                        <>
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Exportación Bloqueada
                        </>
                    ) : (
                        <>
                            <Download className="mr-2 h-4 w-4" />
                            Exportar Minuta (DOCX)
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
