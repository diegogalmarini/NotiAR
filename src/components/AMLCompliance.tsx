"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Save } from "lucide-react";
import { toast } from "sonner";

export function AMLCompliance({ escrituraId }: { escrituraId: string }) {
    const [checks, setChecks] = useState({
        uifVerified: false,
        pepDeclaration: false,
        originOfFunds: false,
        idVerified: false,
    });
    const [notes, setNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        // TODO: Implement save to database
        setTimeout(() => {
            toast.success("Compliance checklist guardado");
            setIsSaving(false);
        }, 500);
    };

    const allChecked = Object.values(checks).every(Boolean);

    return (
        <Card className="h-fit">
            <CardHeader className="border-b bg-slate-50">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Compliance & UIF</CardTitle>
                        <CardDescription>Prevención de lavado de activos</CardDescription>
                    </div>
                    {allChecked ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Completo
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Pendiente
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                {/* Checkboxes */}
                <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                        <Checkbox
                            id="uif"
                            checked={checks.uifVerified}
                            onCheckedChange={(checked) =>
                                setChecks({ ...checks, uifVerified: checked as boolean })
                            }
                        />
                        <Label htmlFor="uif" className="text-sm font-medium cursor-pointer">
                            Verificado en base UIF
                        </Label>
                    </div>

                    <div className="flex items-center space-x-3">
                        <Checkbox
                            id="pep"
                            checked={checks.pepDeclaration}
                            onCheckedChange={(checked) =>
                                setChecks({ ...checks, pepDeclaration: checked as boolean })
                            }
                        />
                        <Label htmlFor="pep" className="text-sm font-medium cursor-pointer">
                            Declaración PEP recibida
                        </Label>
                    </div>

                    <div className="flex items-center space-x-3">
                        <Checkbox
                            id="funds"
                            checked={checks.originOfFunds}
                            onCheckedChange={(checked) =>
                                setChecks({ ...checks, originOfFunds: checked as boolean })
                            }
                        />
                        <Label htmlFor="funds" className="text-sm font-medium cursor-pointer">
                            Origen de fondos declarado
                        </Label>
                    </div>

                    <div className="flex items-center space-x-3">
                        <Checkbox
                            id="id"
                            checked={checks.idVerified}
                            onCheckedChange={(checked) =>
                                setChecks({ ...checks, idVerified: checked as boolean })
                            }
                        />
                        <Label htmlFor="id" className="text-sm font-medium cursor-pointer">
                            Identidad verificada (DNI/CUIT)
                        </Label>
                    </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                    <Label htmlFor="notes" className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        Observaciones
                    </Label>
                    <Textarea
                        id="notes"
                        placeholder="Detalles adicionales del perfil transaccional..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="min-h-[120px] resize-none"
                    />
                </div>

                {/* Save Button */}
                <Button onClick={handleSave} disabled={isSaving} className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Guardando..." : "Guardar Compliance"}
                </Button>
            </CardContent>
        </Card>
    );
}
