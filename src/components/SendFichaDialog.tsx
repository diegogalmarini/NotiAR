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
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                {/* Gradient Header */}
                <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-8 text-white">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Share2 size={120} />
                    </div>
                    <DialogHeader className="relative z-10 text-left">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner">
                                <Share2 size={24} className="text-white" />
                            </div>
                            <DialogTitle className="text-2xl font-black tracking-tight text-white drop-shadow-sm">
                                Enviar Ficha
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-blue-100 text-base leading-relaxed max-w-[320px]">
                            Genera un enlace para que <strong className="text-white underline decoration-blue-400/50 underline-offset-4">{persona.nombre_completo}</strong> complete su información.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-8 bg-white space-y-8">
                    {!link ? (
                        <div className="py-2">
                            <Button
                                onClick={handleGenerate}
                                disabled={loading}
                                className="w-full h-16 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 transition-all rounded-2xl shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                                        Preparando enlace...
                                    </>
                                ) : (
                                    "Generar Link Seguro"
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">
                            {/* Glassmorphism Link Box */}
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
                                <div className="relative flex items-center gap-3 p-5 bg-slate-50 border border-slate-100 rounded-2xl group-hover:border-indigo-200 transition-all shadow-inner">
                                    <code className="text-sm flex-1 truncate font-mono font-medium text-slate-500 select-all tracking-tight">
                                        {link}
                                    </code>
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        onClick={copyToClipboard}
                                        className={cn(
                                            "h-11 w-11 rounded-xl transition-all duration-300",
                                            copied ? "bg-green-100 text-green-600" : "bg-white text-slate-400 hover:text-indigo-600 hover:shadow-md"
                                        )}
                                    >
                                        {copied ? <Check size={20} /> : <Copy size={20} />}
                                    </Button>
                                </div>
                                <span className="absolute -top-2.5 left-5 px-2 bg-white text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Link de Acceso</span>
                            </div>

                            {/* Share Options */}
                            <div className="grid grid-cols-2 gap-5">
                                <Button
                                    variant="outline"
                                    className="h-24 flex flex-col items-center justify-center gap-2 border-slate-100 bg-slate-50/50 hover:bg-green-50 hover:border-green-200 hover:shadow-xl hover:shadow-green-100 text-slate-500 hover:text-green-700 transition-all duration-300 rounded-2xl group/wa"
                                    onClick={shareWhatsApp}
                                >
                                    <div className="p-3 bg-white rounded-xl shadow-sm group-hover/wa:scale-110 transition-transform duration-300 border border-slate-50">
                                        <MessageCircle size={28} className="text-green-500 fill-green-500/10" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-widest">WhatsApp</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-24 flex flex-col items-center justify-center gap-2 border-slate-100 bg-slate-50/50 hover:bg-blue-50 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100 text-slate-500 hover:text-blue-700 transition-all duration-300 rounded-2xl group/mail"
                                    onClick={shareEmail}
                                >
                                    <div className="p-3 bg-white rounded-xl shadow-sm group-hover/mail:scale-110 transition-transform duration-300 border border-slate-50">
                                        <Mail size={28} className="text-blue-500 fill-blue-500/10" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-widest">Email</span>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Minimal Footer */}
                <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex justify-center">
                    <Button
                        variant="ghost"
                        onClick={() => setOpen(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-transparent"
                    >
                        Cerrar Ventana
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
