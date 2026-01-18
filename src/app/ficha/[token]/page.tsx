"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

const formSchema = z.object({
    telefono: z.string().min(6, "Teléfono inválido"),
    email: z.string().email("Email inválido"),
    padres: z.string().min(3, "Por favor ingrese nombres de los padres"),
});

type FormValues = z.infer<typeof formSchema>;

export default function FichaWebPage() {
    const { token } = useParams();
    const [loading, setLoading] = useState(true);
    const [isValid, setIsValid] = useState(false);
    const [persona, setPersona] = useState<any>(null);
    const [step, setStep] = useState<"carga" | "revision">("carga");

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            telefono: "",
            email: "",
            padres: "",
        },
    });

    useEffect(() => {
        async function validateToken() {
            if (!token) return;

            const { data: tokenData, error: tokenError } = await supabase
                .from("fichas_web_tokens")
                .select("*, personas(*)")
                .eq("id", token)
                .eq("estado", "PENDIENTE")
                .single();

            if (tokenError || !tokenData) {
                setIsValid(false);
            } else {
                // Verificar expiración
                if (new Date(tokenData.expires_at) < new Date()) {
                    setIsValid(false);
                } else {
                    setIsValid(true);
                    setPersona(tokenData.personas);
                }
            }
            setLoading(false);
        }

        validateToken();
    }, [token]);

    async function onSubmit(values: FormValues) {
        if (step === "carga") {
            setStep("revision");
            return;
        }

        // Proceso de guardado final
        try {
            const { error: updateError } = await supabase
                .from("personas")
                .update({
                    contacto: { telefono: values.telefono, email: values.email },
                    estado_civil_detallado: { ...persona.estado_civil_detallado, padres: values.padres },
                    origen_dato: "FICHA_WEB_CLIENTE",
                })
                .eq("tax_id", persona.tax_id);

            if (updateError) throw updateError;

            const { error: tokenUpdateError } = await supabase
                .from("fichas_web_tokens")
                .update({ estado: "COMPLETADO" })
                .eq("id", token);

            if (tokenUpdateError) throw tokenUpdateError;

            toast.success("Datos guardados correctamente");
            setStep("revision"); // Podría ser una pantalla de éxito final
        } catch (error: any) {
            toast.error("Error al guardar: " + error.message);
        }
    }

    if (loading) return <div className="flex h-screen items-center justify-center">Cargando...</div>;

    if (!isValid) {
        return (
            <div className="flex h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">Token Inválido o Expirado</CardTitle>
                        <CardDescription>El enlace que intentas usar ya no es válido o ha expirado.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <Toaster />
            <div className="mx-auto max-w-2xl">
                <Card>
                    <CardHeader>
                        <CardTitle>Ficha de Datos del Cliente</CardTitle>
                        <CardDescription>
                            Hola {persona.nombre_completo}, por favor completa tus datos de contacto y filiación.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                {step === "carga" ? (
                                    <>
                                        <FormField
                                            control={form.control}
                                            name="telefono"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Teléfono</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="+54 11 ..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Correo Electrónico</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="correo@ejemplo.com" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="padres"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Nombres de los Padres (Filiación)</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Nombre Completo del Padre y Madre" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="submit" className="w-full">Revisar Datos</Button>
                                    </>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="rounded-lg border bg-slate-100 p-4 space-y-4">
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Teléfono</Label>
                                                <p className="font-medium">{form.getValues("telefono")}</p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Email</Label>
                                                <p className="font-medium">{form.getValues("email")}</p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Padres</Label>
                                                <p className="font-medium">{form.getValues("padres")}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <Button variant="outline" className="flex-1" onClick={() => setStep("carga")}>
                                                Corregir
                                            </Button>
                                            <Button type="submit" className="flex-1">
                                                Confirmar y Enviar
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
