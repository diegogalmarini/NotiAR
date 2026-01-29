"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Loader2, AlertCircle } from "lucide-react";
import { createPersona } from "@/app/actions/personas";
import { toast } from "sonner";
import { isValidCUIT, cn } from "@/lib/utils";

import { PersonForm } from "./PersonForm";

export function NuevoClienteDialog() {
    const router = useRouter();
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm flex items-center gap-2">
                    <UserPlus size={18} />
                    <span>Nuevo Cliente</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-3 text-slate-900">
                        <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                            <UserPlus size={22} />
                        </div>
                        Nuevo Cliente
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 text-sm">
                        Cargue los datos iniciales del cliente. El sistema diferenciará automáticamente si es Persona Física o Jurídica según el CUIT.
                    </DialogDescription>
                </DialogHeader>

                <PersonForm
                    onSuccess={() => {
                        setOpen(false);
                        router.refresh();
                    }}
                    onCancel={() => setOpen(false)}
                />
            </DialogContent>
        </Dialog>
    );
}

