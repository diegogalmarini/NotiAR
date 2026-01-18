"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { getExpiringDeeds } from "@/app/actions/inscription";
import Link from "next/link";

export function ExpiringDeedsAlert() {
    const [deeds, setDeeds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDeeds() {
            const result = await getExpiringDeeds();
            if (result.success) {
                setDeeds(result.data || []);
            }
            setLoading(false);
        }
        fetchDeeds();
    }, []);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Vencimientos Próximos</CardTitle>
                    <CardDescription>Cargando...</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (deeds.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        Vencimientos Próximos
                    </CardTitle>
                    <CardDescription>No hay escrituras pendientes de inscripción</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const getTrafficLightBadge = (trafficLight: string, daysRemaining: number) => {
        const configs = {
            green: {
                className: "bg-green-100 text-green-800 border-green-300",
                icon: Clock,
                label: `${daysRemaining} días restantes`
            },
            yellow: {
                className: "bg-yellow-100 text-yellow-800 border-yellow-300",
                icon: AlertTriangle,
                label: `¡${daysRemaining} días restantes!`
            },
            red: {
                className: "bg-red-100 text-red-800 border-red-300",
                icon: AlertTriangle,
                label: daysRemaining === 0 ? "Vence hoy" : `Vencido hace ${Math.abs(daysRemaining)} días`
            }
        };

        const config = configs[trafficLight as keyof typeof configs] || configs.green;
        const Icon = config.icon;

        return (
            <Badge variant="outline" className={config.className}>
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
            </Badge>
        );
    };

    return (
        <Card>
            <CardHeader className="border-b">
                <CardTitle className="text-lg">Vencimientos Próximos</CardTitle>
                <CardDescription>Escrituras pendientes de inscripción (45 días desde firma)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y">
                    {deeds.slice(0, 5).map((deed) => (
                        <Link
                            key={deed.id}
                            href={`/carpeta/${deed.carpetas.id}`}
                            className="block p-4 hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex flex-col">
                                    <span className="font-semibold text-sm">
                                        {deed.carpetas.caratula || `Carpeta ${deed.carpetas.id.slice(0, 8)}`}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        Protocolo: {deed.nro_protocolo || "Pendiente"}
                                    </span>
                                </div>
                                {getTrafficLightBadge(deed.trafficLight, deed.daysRemaining)}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Firmada: {new Date(deed.fecha_firma_real).toLocaleDateString('es-AR')}</span>
                                <span>Vence: {new Date(deed.fecha_vencimiento_inscripcion).toLocaleDateString('es-AR')}</span>
                                {deed.nro_entrada_registro && (
                                    <span className="text-blue-600 font-medium">
                                        Entrada: {deed.nro_entrada_registro}
                                    </span>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
                {deeds.length > 5 && (
                    <div className="p-4 text-center border-t bg-slate-50">
                        <span className="text-sm text-muted-foreground">
                            +{deeds.length - 5} escrituras más pendientes
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
