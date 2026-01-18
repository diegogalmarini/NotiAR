"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Link as LinkIcon, MessageCircle, Copy, Check, ExternalLink } from "lucide-react";
import { createFichaToken } from "@/app/actions/ficha";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export function ClientOutreach({ personId, personName }: { personId: string; personName: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [url, setUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        const res = await createFichaToken(personId);
        setLoading(false);
        if (res.success && res.url) {
            setUrl(res.url);
            setIsOpen(true);
        } else {
            toast.error(res.error || "No se pudo generar el token");
        }
    };

    const handleCopy = () => {
        if (url) {
            navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success("Enlace copiado");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleWhatsApp = () => {
        if (url) {
            const message = `Hola ${personName}, por favor completa tus datos para la escritura ingresando en este enlace seguro: ${url}`;
            const encodedMessage = encodeURIComponent(message);
            window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
        }
    };

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                onClick={handleGenerate}
                disabled={loading}
                title="Solicitar datos al cliente"
            >
                <LinkIcon className="h-4 w-4" />
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Solicitar Datos: {personName}</DialogTitle>
                        <DialogDescription>
                            Se ha generado un enlace único para que el cliente cargue sus datos de contacto y filiación.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center space-x-2 py-4">
                        <div className="grid flex-1 gap-2">
                            <Input
                                readOnly
                                value={url || ""}
                                className="text-xs font-mono bg-slate-50"
                            />
                        </div>
                        <Button size="icon" variant="outline" onClick={handleCopy}>
                            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>

                    <DialogFooter className="sm:justify-start gap-2">
                        <Button
                            type="button"
                            className="bg-green-600 hover:bg-green-700 text-white flex-1"
                            onClick={handleWhatsApp}
                        >
                            <MessageCircle className="mr-2 h-4 w-4" />
                            Enviar por WhatsApp
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => window.open(url!, "_blank")}
                        >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Previsualizar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
