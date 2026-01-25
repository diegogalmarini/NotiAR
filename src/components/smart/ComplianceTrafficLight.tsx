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
import { cn } from "@/lib/utils";
import { Shield } from "lucide-react";

interface ComplianceTrafficLightProps {
    compliance?: {
        risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
        alerts: string[];
    };
    crossCheck?: {
        state: 'MATCH_TOTAL' | 'REVIEW_REQUIRED' | 'CRITICAL_DISCREPANCY';
        details: Record<string, { match: boolean; severity: 'LOW' | 'HIGH'; message: string }>;
    };
}

export function ComplianceTrafficLight({ compliance, crossCheck }: ComplianceTrafficLightProps) {
    if (!compliance && !crossCheck) return null;

    const riskConfig = {
        LOW: { color: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle2 className="w-4 h-4 mr-1" />, label: 'RIESGO BAJO' },
        MEDIUM: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <AlertTriangle className="w-4 h-4 mr-1" />, label: 'RIESGO MEDIO' },
        HIGH: { color: 'bg-red-100 text-red-700 border-red-200', icon: <AlertCircle className="w-4 h-4 mr-1" />, label: 'RIESGO ALTO' }
    };

    const crossCheckConfig = {
        MATCH_TOTAL: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-4 h-4 mr-1" />, label: 'DOCS VALIDADOS' },
        REVIEW_REQUIRED: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <AlertTriangle className="w-4 h-4 mr-1" />, label: 'REVISIÓN REQUERIDA' },
        CRITICAL_DISCREPANCY: { color: 'bg-rose-100 text-rose-700 border-rose-200', icon: <AlertCircle className="w-4 h-4 mr-1" />, label: 'DISCREPANCIA CRÍTICA' }
    };

    const currentRisk = compliance ? (riskConfig[compliance.risk_level] || riskConfig.LOW) : null;
    const currentCC = crossCheck ? (crossCheckConfig[crossCheck.state] || crossCheckConfig.MATCH_TOTAL) : null;

    return (
        <div className="flex items-center gap-2">
            <Dialog>
                <DialogTrigger asChild>
                    <Badge variant="outline" className={cn("cursor-pointer px-3 py-1 font-bold shadow-sm flex items-center transition-all hover:scale-105", currentCC?.color)}>
                        {currentCC?.icon}
                        {currentCC?.label}
                    </Badge>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-2">
                            {currentCC?.icon}
                            <DialogTitle>Motor de Validación Cruzada (Triangulación)</DialogTitle>
                        </div>
                        <DialogDescription>
                            Comparación de datos entre API Oficial, Extracción IA y Entrada Manual.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        {crossCheck?.details && Object.entries(crossCheck.details).map(([field, info]) => (
                            <div key={field} className={cn("p-3 rounded-lg border flex items-start gap-3", info.match ? "bg-emerald-50 border-emerald-100" : (info.severity === 'HIGH' ? "bg-rose-50 border-rose-100" : "bg-amber-50 border-amber-100"))}>
                                {info.match ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" /> : <AlertCircle className={cn("w-4 h-4 mt-0.5", info.severity === 'HIGH' ? "text-rose-600" : "text-amber-600")} />}
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">{field.replace(/_/g, ' ')}</p>
                                    <p className="text-sm font-medium">{info.message}</p>
                                </div>
                            </div>
                        ))}

                        {crossCheck?.state === 'CRITICAL_DISCREPANCY' && (
                            <div className="p-4 bg-red-600 text-white rounded-lg flex items-center gap-3 animate-pulse">
                                <Shield className="w-6 h-6 shrink-0" />
                                <p className="text-sm font-bold">BLOQUEO DE SEGURIDAD ACTIVADO: Los datos no coinciden con la fuente oficial. Corrija antes de generar la minuta.</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {compliance && (
                <Dialog>
                    <DialogTrigger asChild>
                        <Badge variant="outline" className={cn("cursor-pointer px-3 py-1 font-bold shadow-sm flex items-center", currentRisk?.color)}>
                            {currentRisk?.icon}
                            {currentRisk?.label}
                        </Badge>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <div className="flex items-center gap-2 mb-2">
                                {currentRisk?.icon}
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
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
