"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Folder, ExternalLink } from "lucide-react";
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
                <CardContent className="py-12 text-center">
                    <Folder className="mx-auto h-12 w-12 opacity-20 text-slate-400 mb-4" />
                    <p className="text-slate-500 text-sm">Este cliente no aparece en ninguna carpeta todavía.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {carpetasWithOps.map((carpeta) => (
                <Card key={carpeta.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 rounded-lg">
                                    <Folder size={18} className="text-slate-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-bold text-slate-900">
                                        Carpeta #{carpeta.numero}
                                    </CardTitle>
                                    {carpeta.observaciones && (
                                        <p className="text-xs text-slate-500 mt-0.5">{carpeta.observaciones}</p>
                                    )}
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/carpeta/${carpeta.id}`)}
                                className="h-8 text-xs"
                            >
                                <ExternalLink size={14} className="mr-1.5" />
                                Abrir
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-3">
                        {carpeta.operaciones.length > 0 ? (
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                    Participación en esta carpeta
                                </p>
                                {carpeta.operaciones.map((op, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FileText size={16} className="text-slate-400" />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-slate-900">
                                                        {op.tipo || 'Operación'}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-[10px] font-bold px-1.5 py-0",
                                                            op.rol?.toLowerCase().includes("compra")
                                                                ? "bg-green-50 text-green-700 border-green-200"
                                                                : op.rol?.toLowerCase().includes("vend")
                                                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                                                    : "bg-slate-50 text-slate-600 border-slate-200"
                                                        )}
                                                    >
                                                        {op.rol || 'Participante'}
                                                    </Badge>
                                                </div>
                                                {op.escritura && (
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        Escritura #{op.escritura.numero} - {op.escritura.tipo}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 italic">Sin operaciones registradas</p>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
