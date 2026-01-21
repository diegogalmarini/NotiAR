"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Escribano, createEscribano, updateEscribano } from "@/app/actions/escribanos";
import { toast } from "sonner";

const escribanoSchema = z.object({
    nombre_completo: z.string().min(3, "El nombre es obligatorio"),
    caracter: z.enum(["TITULAR", "ADSCRIPTO", "INTERINO"]),
    genero_titulo: z.enum(["ESCRIBANO", "ESCRIBANA", "NOTARIO", "NOTARIA"]),
    numero_registro: z.string().optional(),
    distrito_notarial: z.string().optional(),
    matricula: z.string().optional(),
    cuit: z.string().optional(),
    domicilio_legal: z.string().optional(),
});

type EscribanoFormValues = z.infer<typeof escribanoSchema>;

interface NuevoEscribanoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    escribano?: Escribano | null;
    mode?: 'create' | 'edit';
}

export function NuevoEscribanoDialog({
    open,
    onOpenChange,
    onSuccess,
    escribano,
    mode = 'create'
}: NuevoEscribanoDialogProps) {
    const [loading, setLoading] = useState(false);

    const form = useForm<EscribanoFormValues>({
        resolver: zodResolver(escribanoSchema),
        defaultValues: {
            nombre_completo: "",
            caracter: "TITULAR",
            genero_titulo: "ESCRIBANO",
            numero_registro: "",
            distrito_notarial: "Bahía Blanca",
            matricula: "",
            cuit: "",
            domicilio_legal: "",
        },
    });

    useEffect(() => {
        if (escribano && mode === 'edit') {
            form.reset({
                nombre_completo: escribano.nombre_completo,
                caracter: escribano.caracter,
                genero_titulo: escribano.genero_titulo,
                numero_registro: escribano.numero_registro || "",
                distrito_notarial: escribano.distrito_notarial || "",
                matricula: escribano.matricula || "",
                cuit: escribano.cuit || "",
                domicilio_legal: escribano.domicilio_legal || "",
            });
        } else if (mode === 'create') {
            form.reset({
                nombre_completo: "",
                caracter: "TITULAR",
                genero_titulo: "ESCRIBANO",
                numero_registro: "",
                distrito_notarial: "Bahía Blanca",
                matricula: "",
                cuit: "",
                domicilio_legal: "",
            });
        }
    }, [escribano, mode, form, open]);

    const onSubmit = async (values: EscribanoFormValues) => {
        setLoading(true);
        try {
            let res;
            if (mode === 'edit' && escribano) {
                res = await updateEscribano(escribano.id, values);
            } else {
                res = await createEscribano(values);
            }

            if (res.success) {
                toast.success(mode === 'edit' ? "Escribano actualizado" : "Escribano creado correctamente");
                onSuccess();
            } else {
                toast.error(res.error || "Error al guardar");
            }
        } catch (error) {
            toast.error("Ocurrió un error inesperado");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{mode === 'edit' ? 'Editar Escribano' : 'Nuevo Escribano Autorizante'}</DialogTitle>
                    <DialogDescription>
                        Complete los datos oficiales del escribano para los documentos.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="nombre_completo"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel>Nombre Completo</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ej: Juan Pérez" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="genero_titulo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Título (Género)</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccione título" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="ESCRIBANO">Escribano</SelectItem>
                                                <SelectItem value="ESCRIBANA">Escribana</SelectItem>
                                                <SelectItem value="NOTARIO">Notario</SelectItem>
                                                <SelectItem value="NOTARIA">Notaria</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="caracter"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Carácter</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccione carácter" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="TITULAR">Titular</SelectItem>
                                                <SelectItem value="ADSCRIPTO">Adscripto</SelectItem>
                                                <SelectItem value="INTERINO">Interino</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="numero_registro"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Número de Registro</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ej: 38" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="distrito_notarial"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Distrito Notarial</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ej: Bahía Blanca" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="matricula"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Matrícula</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ej: 12345" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="cuit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>CUIT</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ej: 20-12345678-9" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="domicilio_legal"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel>Domicilio Legal</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Dirección completa de la escribanía" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Guardando..." : mode === 'edit' ? 'Guardar Cambios' : 'Crear Escribano'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
