"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Folder, ExternalLink, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface ClientRelationsListProps {
    operaciones: Array<{
        id: string;
        tipo: string;
        rol: string;
        escritura?: {
            id: string;
            numero: string;
            tipo: string;
            carpeta?: {
                id: string;
                numero: string;
            };
        };
    }>;
    carpetas: Array<{
        id: string;
        numero: string;
        observaciones?: string;
    }>;
}

export function ClientRelationsList({ operaciones, carpetas }: ClientRelationsListProps) {
    const router = useRouter();

    // Group operaciones by carpeta
    const carpetasWithOps = carpetas.map(carpeta => {
        const relatedOps = operaciones.filter(
            op => op.escritura?.carpeta?.id === carpeta.id
        );
        return { ...carpeta, operaciones: relatedOps };
    });

    if (carpetas.length === 0) {
        return (
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="py-16 text-center">
                    <Folder className="mx-auto h-16 w-16 opacity-10 text-slate-400 mb-4" />
                    <p className="text-slate-500 text-sm font-medium">Este cliente no aparece en ninguna carpeta todavía.</p>
                    <p className="text-slate-400 text-xs mt-2">Las relaciones con carpetas y escrituras aparecerán aquí cuando se agreguen.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-sm text-slate-600">
                <span className="font-bold">Total:</span> {carpetas.length} {carpetas.length === 1 ? 'carpeta' : 'carpetas'}
            </div>

            {carpetasWithOps.map((carpeta) => (
                <Card key={carpeta.id} className="border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
                    <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1">
                                <div className="p-3 bg-white rounded-xl border-2 border-slate-200 shadow-sm">
                                    <Folder size={24} className="text-slate-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <CardTitle className="text-xl font-bold text-slate-900">
                                            Carpeta N° {carpeta.numero || 'Sin número'}
                                        </CardTitle>
                                    </div>
                                    {carpeta.observaciones && (
                                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                                            {carpeta.observaciones}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-3">
                                        <Badge variant="outline" className="text-xs bg-slate-50">
                                            {carpeta.operaciones.length} {carpeta.operaciones.length === 1 ? 'operación' : 'operaciones'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="default"
                                size="default"
                                onClick={() => router.push(`/carpeta/${carpeta.id}`)}
                                className="shrink-0 bg-slate-900 hover:bg-slate-800 gap-2"
                            >
                                Ver Carpeta
                                <Arrow Right size={16} />
                            </Button>
                        </div>
                    </CardHeader>

                    {carpeta.operaciones.length > 0 && (
                        <CardContent className="pt-5">
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Participación del cliente
                                </h4>
                                {carpeta.operaciones.map((op, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                                                <FileText size={20} className="text-slate-500" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="text-base font-semibold text-slate-900">
                                                        {op.tipo || 'Operación sin tipo'}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-[11px] font-bold px-2 py-0.5",
                                                            op.rol?.toUpperCase().includes("COMPRA") || op.rol?.toUpperCase().includes("ADQUIR")
                                                                ? "bg-green-50 text-green-700 border-green-300"
                                                                : op.rol?.toUpperCase().includes("VEND") || op.rol?.toUpperCase().includes("TRANSMIT")
                                                                    ? "bg-blue-50 text-blue-700 border-blue-300"
                                                                    : "bg-slate-100 text-slate-700 border-slate-300"
                                                        )}
                                                    >
                                                        {op.rol || 'Rol no especificado'}
                                                    </Badge>
                                                </div>
                                                {op.escritura && (
                                                    <p className="text-sm text-slate-600">
                                                        <span className="font-medium">Escritura:</span> N° {op.escritura.numero || 'Sin número'}
                                                        {op.escritura.tipo && <span className="text-slate-500"> • {op.escritura.tipo}</span>}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    )}
                </Card>
            ))}
        </div>
    );
}

        </div >
    );
}
