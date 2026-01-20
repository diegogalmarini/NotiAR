"use client";

import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deletePersona } from "@/app/actions/personas";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DeleteClienteDialogProps {
    personaId: string;
    personaNombre: string;
}

export function DeleteClienteDialog({ personaId, personaNombre }: DeleteClienteDialogProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        setLoading(true);
        const res = await deletePersona(personaId);
        setLoading(false);

        if (res.success) {
            toast.success("Cliente eliminado correctamente");
            router.refresh();
        } else {
            toast.error(res.error || "Error al eliminar el cliente");
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50 hover:text-red-700">
                    <Trash2 size={16} />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar Cliente?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Estás a punto de eliminar a <strong>{personaNombre}</strong> (ID: {personaId}).
                        <br /><br />
                        Esta acción no se puede deshacer. Se eliminarán todos los registros asociados.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {loading ? "Eliminando..." : "Eliminar Definitivamente"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
