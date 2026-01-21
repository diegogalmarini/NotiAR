"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";

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
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border border-slate-200 shadow-xl rounded-2xl bg-white">
                {/* Clean Header */}
                <div className="bg-slate-50 p-8 border-b border-slate-100">
                    <DialogHeader className="text-left">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-slate-200 text-slate-600 rounded-lg">
                                <Share2 size={20} />
                            </div>
                            <DialogTitle className="text-xl font-bold text-slate-900">
                                Enviar Ficha de Datos
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-slate-500 text-sm">
                            Genera un enlace para que <strong className="text-slate-900">{persona.nombre_completo}</strong> complete su información personal.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-8 bg-white space-y-8">
                    {!link ? (
                        <div className="py-2">
                            <Button
                                onClick={handleGenerate}
                                disabled={loading}
                                className="w-full h-12 text-base font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-all rounded-xl shadow-sm"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Generando enlace...
                                    </>
                                ) : (
                                    "Generar Link de Acceso"
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Standard Link Box */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Link de Acceso</Label>
                                <div className="flex items-center gap-2 p-1 pl-4 bg-slate-50 border border-slate-200 rounded-xl">
                                    <code className="text-xs flex-1 truncate font-mono text-slate-600">
                                        {link}
                                    </code>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={copyToClipboard}
                                        className={cn(
                                            "h-9 w-9 rounded-lg transition-colors",
                                            copied ? "text-green-600 bg-green-50" : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                                        )}
                                    >
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                    </Button>
                                </div>
                            </div>

                            {/* Share Options */}
                            <div className="grid grid-cols-2 gap-4">
                                <Button
                                    variant="outline"
                                    className="h-16 flex items-center justify-center gap-3 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all rounded-xl shadow-sm"
                                    onClick={shareWhatsApp}
                                >
                                    <MessageCircle size={20} className="text-green-600" />
                                    <span className="text-xs font-semibold">WhatsApp</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-16 flex items-center justify-center gap-3 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all rounded-xl shadow-sm"
                                    onClick={shareEmail}
                                >
                                    <Mail size={20} className="text-slate-600" />
                                    <span className="text-xs font-semibold">Email</span>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Minimal Footer */}
                <div className="px-8 py-4 flex justify-center bg-slate-50/50">
                    <Button
                        variant="ghost"
                        onClick={() => setOpen(false)}
                        className="text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase tracking-wider h-8"
                    >
                        Cerrar Ventana
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
