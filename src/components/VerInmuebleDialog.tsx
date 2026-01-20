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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, FileText, File, FileType } from "lucide-react";
import { downloadAsTxt, downloadAsPdf, downloadAsDocx } from "@/lib/downloadUtils";

interface VerInmuebleDialogProps {
    inmueble: any;
}

export function VerInmuebleDialog({ inmueble }: VerInmuebleDialogProps) {
    const filename = `transcripcion-${inmueble.nomenclatura || 'inmueble'}-${inmueble.nro_partida || 'sin-partida'}`;

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
                    <div className="flex justify-between items-start pr-8">
                        <div>
                            <DialogTitle>Detalle del Inmueble</DialogTitle>
                            <DialogDescription>
                                {inmueble.nomenclatura || "Sin nomenclatura"}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden mt-4 border rounded-md bg-slate-50 p-4">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-muted-foreground">Transcripción Literal:</p>
                        <div className="flex gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => downloadAsTxt(filename, inmueble.transcripcion_literal || "")}
                                title="Descargar como TXT"
                            >
                                <FileText className="h-3 w-3" /> TXT
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => downloadAsPdf(filename, inmueble.transcripcion_literal || "")}
                                title="Descargar como PDF"
                            >
                                <File className="h-3 w-3" /> PDF
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => downloadAsDocx(filename, inmueble.transcripcion_literal || "")}
                                title="Descargar como DOCX"
                            >
                                <FileType className="h-3 w-3" /> DOCX
                            </Button>
                        </div>
                    </div>
                    <ScrollArea className="h-[400px] w-full pr-4 text-justify text-sm leading-relaxed">
                        {inmueble.transcripcion_literal || "No hay transcripción disponible."}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function DownloadInmuebleButton({ inmueble }: { inmueble: any }) {
    return null;
}
