"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Share2, MessageCircle, Mail, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateFichaLink } from "@/app/actions/fichas";

interface SendFichaDialogProps {
    persona: {
        dni: string;
        nombre_completo: string;
    };
}

export function SendFichaDialog({ persona }: SendFichaDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [link, setLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        const res = await generateFichaLink(persona.dni);
        setLoading(false);

        if (res.success && res.link) {
            setLink(res.link);
        } else {
            toast.error("Error al generar el link");
        }
    };

    const copyToClipboard = () => {
        if (!link) return;
        navigator.clipboard.writeText(link);
        setCopied(true);
        toast.success("Link copiado al portapapeles");
        setTimeout(() => setCopied(false), 2000);
    };

    const shareWhatsApp = () => {
        if (!link) return;
        const text = `Hola ${persona.nombre_completo}, por favor completa tus datos para el trámite en el siguiente link: ${link}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const shareEmail = () => {
        if (!link) return;
        const subject = "Ficha de Datos Personales - NotiAR";
        const body = `Hola ${persona.nombre_completo},\n\nPor favor, completa tus datos personales ingresando al siguiente link seguro:\n${link}\n\nMuchas gracias.`;
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) {
                setLink(null);
                setCopied(false);
            }
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Share2 size={14} /> Ficha
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Enviar Ficha de Datos</DialogTitle>
                    <DialogDescription>
                        Genera un link único para que <strong>{persona.nombre_completo}</strong> complete sus datos desde su celular.
                    </DialogDescription>
                </DialogHeader>

                {!link ? (
                    <div className="py-6 flex justify-center">
                        <Button onClick={handleGenerate} disabled={loading} className="w-full">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Generar Link Seguro
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6 py-4 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-md border border-slate-200">
                            <code className="text-xs flex-1 truncate">{link}</code>
                            <Button size="icon" variant="ghost" onClick={copyToClipboard}>
                                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" className="flex items-center gap-2 border-green-200 hover:bg-green-50 text-green-700" onClick={shareWhatsApp}>
                                <MessageCircle size={18} /> WhatsApp
                            </Button>
                            <Button variant="outline" className="flex items-center gap-2 border-blue-200 hover:bg-blue-50 text-blue-700" onClick={shareEmail}>
                                <Mail size={18} /> Email
                            </Button>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
