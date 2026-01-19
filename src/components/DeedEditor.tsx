"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Wand2, Save, Copy, Loader2, FileDown, FileText } from "lucide-react";
import { generateDeedDraft, saveDeedDraft } from "@/app/actions/draft";
import { updateFolderStatus } from "@/app/actions/carpeta";
import { exportToDocx } from "@/lib/utils/export";
import { toast } from "sonner";

interface DeedEditorProps {
    escrituraId: string;
    initialContent?: string;
    dataSummary: any;
}

export function DeedEditor({ escrituraId, initialContent, dataSummary }: DeedEditorProps) {
    const [content, setContent] = useState(initialContent || "");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true);
        const res = await generateDeedDraft(escrituraId);
        setIsGenerating(false);

        if (res.success && res.draft) {
            setContent(res.draft);
            toast.success("Borrador generado con éxito");
        } else {
            toast.error(res.error || "Error al generar el borrador");
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        const res = await saveDeedDraft(escrituraId, content);
        setIsSaving(false);

        if (res.success) {
            toast.success("Borrador guardado");
        } else {
            toast.error(res.error);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        toast.success("Copiado al portapapeles");
    };

    const handleExportDocx = async () => {
        if (!content) return toast.error("No hay contenido para exportar");

        await exportToDocx("Borrador_Escritura", content);
        toast.success("Archivo Word generado");

        // Suggest updating status
        toast("Archivo descargado", {
            description: "¿Deseas marcar la carpeta como 'PARA FIRMA'?",
            action: {
                label: "Sí, marcar",
                onClick: async () => {
                    // We need folderId here. For simplicity, we assume we can get it or the user will use the stepper.
                    // Since we're in the editor, we might need to pass folderId as prop.
                    toast.info("Usa la barra de estados superior para actualizar el proceso.");
                },
            },
        });
    };

    const handlePrintPdf = () => {
        window.print();
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex justify-between items-center bg-background py-2 border-b sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <Button
                        variant="default"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                        {isGenerating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Wand2 className="mr-2 h-4 w-4" />
                        )}
                        {isGenerating ? "Redactando..." : "Generar con IA"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving} className="shadow-sm">
                        <Save className="mr-2 h-4 w-4" />
                        Guardar
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-xs" onClick={handleCopy}>
                        <Copy className="mr-2 h-3 w-3" />
                        Copiar
                    </Button>
                    <div className="h-4 w-[1px] bg-border mx-1" />
                    <Button variant="secondary" size="sm" className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" onClick={handleExportDocx}>
                        <FileDown className="mr-2 h-3 w-3" />
                        Bajar Word
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs" onClick={handlePrintPdf}>
                        <FileText className="mr-2 h-3 w-3" />
                        Previa PDF
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
                {/* Left: Data Summary (Consultation) */}
                <div className="lg:col-span-4 space-y-4 overflow-y-auto pr-2 custom-scrollbar max-h-[calc(100vh-320px)]">
                    <Card className="bg-slate-50/50">
                        <CardHeader className="p-4 border-b bg-muted/30">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Datos de Consulta
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4 text-xs">
                            <div className="space-y-1">
                                <p className="font-bold text-indigo-700">Inmueble:</p>
                                <p className="text-muted-foreground leading-relaxed font-medium">
                                    {dataSummary.inmuebles?.direccion_completa || "No vinculado"}
                                </p>
                                <p className="text-muted-foreground">
                                    Partida: {dataSummary.inmuebles?.nro_partida || "N/A"}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <p className="font-bold text-indigo-700">Personas Vinculadas:</p>
                                {dataSummary.operaciones?.[0]?.participantes_operacion?.map((p: any) => (
                                    <div key={p.id} className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm space-y-1">
                                        <p className="font-bold text-slate-900 text-[11px]">{p.personas.nombre_completo}</p>
                                        <div className="flex justify-between items-center">
                                            <Badge variant="outline" className="text-[8px] py-0 px-1 bg-indigo-50 text-indigo-700 border-indigo-100">{p.rol}</Badge>
                                            <span className="text-[8px] font-mono opacity-60">{p.personas.tax_id}</span>
                                        </div>
                                        <div className="text-[10px] space-y-0.5 pt-1 border-t mt-1 border-slate-100">
                                            <p className="text-slate-600 truncate"><span className="font-semibold text-indigo-500">📍</span> {p.personas.domicilio_real?.literal || "No consta"}</p>
                                            <p className="text-slate-600 italic"><span className="font-semibold text-indigo-500">👪</span> {p.personas.estado_civil_detallado?.padres || "Filiación pendiente"}</p>
                                            <p className="text-slate-600"><span className="font-semibold text-indigo-500">💍</span> {p.personas.estado_civil_detallado?.estado || "Civil pendiente"}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 italic text-[10px] text-amber-800 leading-relaxed shadow-sm">
                                💡 Compara los datos de la izquierda con el texto redactado en la derecha para asegurar exactitud notarial.
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Rich Editor */}
                <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
                    <Card className="flex-1 shadow-sm border bg-white overflow-hidden flex flex-col">
                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="flex-1 w-full p-10 font-serif text-[1.1rem] leading-[1.8] focus-visible:ring-0 border-none resize-none overflow-y-auto"
                            placeholder="El borrador aparecerá aquí..."
                        />
                    </Card>
                    <p className="text-[10px] text-muted-foreground italic text-center mt-2 shrink-0">
                        Escritura redactada con apoyo de IA. Requiere supervisión profesional.
                    </p>
                </div>
            </div>
        </div>
    );
}
