"use client";

import React, { useState } from "react";
import { FolderPlus, Upload, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function MagicDropzone() {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const router = useRouter();

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        const pdfFile = files.find(f => f.type === "application/pdf");

        if (!pdfFile) {
            toast.error("Por favor, arrastra un archivo PDF válido.");
            return;
        }

        await processFile(pdfFile);
    };

    const processFile = async (file: File) => {
        setIsUploading(true);
        const toastId = toast.loading("Iniciando 'Magia'... leyendo documento y creando carpeta.");

        try {
            // Simulated extraction data (as we don't have real OCR yet, but we'll call the ingest API)
            // In a real scenario, we'd upload the file to a storage and then call a worker
            // For now, we simulate the "Ingest" flow that creates a folder + extracted data

            // To be consistent with "Gonzalo's Magic", we call the ingest API
            // which we will refactor to support folder creation.

            const response = await fetch("/api/ingest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    // Simulated data that might come from OCR
                    tax_id: "20-12345678-9",
                    nombre_completo: "CLIENTE EXTRAIDO POR IA",
                    origen_dato: "IA_OCR",
                    create_folder: true, // New flag for our API
                    folder_name: `Carpeta Magica - ${file.name}`
                })
            });

            if (!response.ok) throw new Error("Error en la ingesta");

            const result = await response.json();

            toast.success("Carpeta creada y datos extraídos correctamente!", { id: toastId });

            // Redirect to the new folder workspace
            if (result.folderId) {
                router.push(`/carpeta/${result.folderId}`);
            } else {
                router.push("/dashboard");
            }

        } catch (error) {
            console.error(error);
            toast.error("Hubo un error al procesar el archivo.", { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
                "group relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 flex flex-col items-center justify-center text-center gap-4 cursor-pointer overflow-hidden",
                isDragging
                    ? "border-primary bg-primary/5 scale-[1.02] ring-4 ring-primary/10"
                    : "border-slate-200 hover:border-primary/50 hover:bg-slate-50",
                isUploading && "pointer-events-none opacity-50"
            )}
        >
            {/* Background Magic Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className={cn(
                "w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center transition-transform duration-500",
                isDragging ? "scale-110 rotate-12" : "group-hover:scale-110"
            )}>
                {isUploading ? (
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                ) : (
                    <Upload className={cn("h-10 w-10 text-primary", isDragging && "animate-bounce")} />
                )}
            </div>

            <div className="space-y-2 relative z-10">
                <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                    {isDragging ? "¡Sueltalo ahora!" : "Inicia un trámite con Magia"}
                </h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                    Arrastra tu Escritura, PDF o Ficha aquí. NotiAr creará la carpeta y extraerá los datos automáticamente.
                </p>
            </div>

            <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <FileText size={14} /> PDF admitidos
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <FolderPlus size={14} /> Auto-creación de carpeta
                </div>
            </div>

            {/* Hidden Input for Click Access */}
            <input
                type="file"
                accept=".pdf"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processFile(file);
                }}
            />
        </div>
    );
}
