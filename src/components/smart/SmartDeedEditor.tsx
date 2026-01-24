"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Save, Loader2, CheckCircle } from "lucide-react";
import { updateEscritura } from "@/app/actions/escritura";
import { toast } from "sonner";

interface SmartDeedEditorProps {
    escrituraId: string;
    initialContent: string;
}

export function SmartDeedEditor({ escrituraId, initialContent }: SmartDeedEditorProps) {
    const [content, setContent] = useState(initialContent || "");
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const result = await updateEscritura(escrituraId, {
                contenido_borrador: content
            });
            if (result.success) {
                toast.success("Borrador guardado correctamente");
                setHasChanges(false);
            } else {
                toast.error("Error al guardar: " + result.error);
            }
        } catch (error) {
            toast.error("Error inesperado al guardar");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="shadow-lg border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <CardTitle className="text-xl">Borrador Inteligente</CardTitle>
                        <p className="text-xs text-muted-foreground">Revisión y edición de la escritura autogenerada.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {hasChanges && (
                        <span className="text-xs text-amber-600 font-medium animate-pulse">
                            Cambios sin guardar
                        </span>
                    )}
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !hasChanges}
                        className="gap-2 shadow-sm"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isSaving ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <Textarea
                    value={content}
                    onChange={(e) => {
                        setContent(e.target.value);
                        setHasChanges(true);
                    }}
                    placeholder="El borrador se generará automáticamente tras la ingesta..."
                    className="min-h-[600px] font-mono text-sm leading-relaxed p-6 bg-white border-slate-200 focus:ring-blue-500 shadow-inner resize-none"
                    spellCheck={false}
                />

                <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
                    <p>Total caracteres: {content.length} | Líneas estimadas: {Math.ceil(content.length / 80)}</p>
                    <div className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>Sincronizado con base de datos</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
