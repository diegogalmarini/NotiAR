"use client";

import { Badge } from "@/components/ui/badge";
import {
    AlertCircle,
    CheckCircle2,
    AlertTriangle,
    Info
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface ComplianceTrafficLightProps {
    compliance: {
        risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
        alerts: string[];
    };
}

export function ComplianceTrafficLight({ compliance }: ComplianceTrafficLightProps) {
    if (!compliance) return null;

    const config = {
        LOW: { color: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle2 className="w-4 h-4 mr-1" />, label: 'RIESGO BAJO' },
        MEDIUM: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <AlertTriangle className="w-4 h-4 mr-1" />, label: 'RIESGO MEDIO' },
        HIGH: { color: 'bg-red-100 text-red-700 border-red-200', icon: <AlertCircle className="w-4 h-4 mr-1" />, label: 'RIESGO ALTO' }
    };

    const current = config[compliance.risk_level] || config.LOW;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Badge variant="outline" className={`cursor-pointer px-3 py-1 font-bold shadow-sm flex items-center ${current.color}`}>
                    {current.icon}
                    {current.label}
                </Badge>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        {current.icon}
                        <DialogTitle>Auditoría de Cumplimiento (UIF)</DialogTitle>
                    </div>
                    <DialogDescription>
                        Análisis automático basado en perfiles de clientes y montos de operación.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    <div className="bg-slate-50 p-4 rounded-lg border">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Alertas Detectadas:</p>
                        {compliance.alerts && compliance.alerts.length > 0 ? (
                            <ul className="space-y-2">
                                {compliance.alerts.map((alert, i) => (
                                    <li key={i} className="text-sm flex items-start gap-2">
                                        <Info className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                                        <span>{alert}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-600 italic">No se detectaron inconsistencias críticas.</p>
                        )}
                    </div>

                    <div className="text-xs text-muted-foreground italic border-t pt-4">
                        * Este análisis es informativo. El escribano responsable debe realizar la debida diligencia final.
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
