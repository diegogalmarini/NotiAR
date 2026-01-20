"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface VerInmuebleDialogProps {
    inmueble: any;
}

export function VerInmuebleDialog({ inmueble }: VerInmuebleDialogProps) {
    const handleDownload = () => {
        const content = `
INMUEBLE - DATOS REGISTRALES
============================
Partido: ${inmueble.partido_id || '-'}
Partida: ${inmueble.nro_partida || '-'}
Nomenclatura: ${inmueble.nomenclatura || '-'}

TRANSCRIPCIÓN LITERAL
=====================
${inmueble.transcripcion_literal || 'Sin transcripción'}
        `.trim();

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Inmueble_${inmueble.nro_partida || 'documento'}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-50 text-blue-600">
                        <Search size={16} />
                    </Button>
                </div>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <div className="flex justify-between items-start mr-8">
                        <div>
                            <DialogTitle>Detalle del Inmueble</DialogTitle>
                            <DialogDescription>
                                Partida: {inmueble.nro_partida} • {inmueble.partido_id}
                            </DialogDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
                            <Download size={14} />
                            Descargar
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden mt-4 border rounded-md bg-slate-50 p-4">
                    <p className="text-sm font-medium mb-2 text-muted-foreground">Transcripción Literal:</p>
                    <ScrollArea className="h-[400px] w-full pr-4 text-justify text-sm leading-relaxed">
                        {inmueble.transcripcion_literal || "No hay transcripción disponible."}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function DownloadInmuebleButton({ inmueble }: VerInmuebleDialogProps) {
    const handleDownload = () => {
        const content = `
INMUEBLE - DATOS REGISTRALES
============================
Partido: ${inmueble.partido_id || '-'}
Partida: ${inmueble.nro_partida || '-'}
Nomenclatura: ${inmueble.nomenclatura || '-'}

TRANSCRIPCIÓN LITERAL
=====================
${inmueble.transcripcion_literal || 'Sin transcripción'}
        `.trim();

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Inmueble_${inmueble.nro_partida || 'documento'}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" onClick={handleDownload} title="Descargar Transcripción">
            <Download size={16} />
        </Button>
    )
}
