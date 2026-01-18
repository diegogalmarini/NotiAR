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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { CheckCircle2, Send } from "lucide-react";

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
    const [step, setStep] = useState<"carga" | "revision" | "exito">("carga");

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
                    // Pre-fill if some data already exists
                    if (tokenData.personas.contacto?.telefono) {
                        form.setValue("telefono", tokenData.personas.contacto.telefono);
                    }
                    if (tokenData.personas.contacto?.email) {
                        form.setValue("email", tokenData.personas.contacto.email);
                    }
                }
            }
            setLoading(false);
        }

        validateToken();
    }, [token, form]);

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
                    estado_civil_detallado: { ...persona.estado_civil_detallado, padres: values.padres.toUpperCase() },
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
            setStep("exito");
        } catch (error: any) {
            toast.error("Error al guardar: " + error.message);
        }
    }

    if (loading) return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm font-medium text-slate-500">Validando acceso seguro...</p>
        </div>
    );

    if (!isValid && step !== "exito") {
        return (
            <div className="flex h-screen items-center justify-center p-4 bg-slate-50">
                <Card className="w-full max-w-md shadow-xl border-red-100">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-red-100 h-12 w-12 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-6 w-6 text-red-600" />
                        </div>
                        <CardTitle className="text-destructive">Acceso No Válido</CardTitle>
                        <CardDescription>El enlace ha expirado, ya fue utilizado o es incorrecto.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Button variant="outline" onClick={() => window.close()} className="w-full">Cerrar Ventana</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (step === "exito") {
        return (
            <div className="flex h-screen items-center justify-center p-4 bg-slate-50">
                <Card className="w-full max-w-md shadow-2xl border-green-100">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-green-100 h-16 w-16 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl text-green-800">¡Muchas Gracias!</CardTitle>
                        <CardDescription className="text-base">
                            Tus datos han sido recibidos correctamente por la escribanía.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-sm text-slate-500 italic">
                            Ya puedes cerrar esta pestaña. Nos pondremos en contacto si necesitamos información adicional.
                        </p>
                        <Button className="w-full" variant="outline" onClick={() => window.close()}>Cerrar</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center">
            <Toaster position="top-center" />
            <div className="w-full max-w-2xl">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">NotiAr</h1>
                    <p className="text-slate-500">Gestión Notarial Inteligente</p>
                </div>

                <Card className="shadow-2xl border-none">
                    <CardHeader className="border-b bg-white rounded-t-xl">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-xl">Ficha de Datos</CardTitle>
                                <CardDescription className="font-medium text-slate-700">
                                    Cliente: <span className="text-primary">{persona.nombre_completo}</span>
                                </CardDescription>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-primary font-bold">{step === "carga" ? "1" : "2"}/2</span>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6 md:p-8 bg-white/50 backdrop-blur-sm">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                {step === "carga" ? (
                                    <div className="space-y-6 animate-in slide-in-from-right duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField
                                                control={form.control}
                                                name="telefono"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-slate-600">Teléfono Móvil</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="+54 9 11 ..." {...field} className="h-12 focus:ring-2" />
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
                                                        <FormLabel className="text-slate-600">Correo Electrónico</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="correo@ejemplo.com" {...field} className="h-12 focus:ring-2" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="padres"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-600">Nombres de los Padres (Filiación)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Nombre Completo del Padre y Madre"
                                                            {...field}
                                                            className="h-12 focus:ring-2 uppercase"
                                                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                        />
                                                    </FormControl>
                                                    <CardDescription className="text-[10px] mt-1 italic">
                                                        Este dato es requerido para la redacción de la escritura según normas notariales.
                                                    </CardDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="submit" className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20">
                                            Revisar Información
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-8 animate-in zoom-in-95 duration-200">
                                        <div className="text-center space-y-2">
                                            <h3 className="font-bold text-lg text-slate-800">Paso 2: Confirmación</h3>
                                            <p className="text-sm text-slate-500">Por favor, verifica que los datos sean correctos antes de enviar.</p>
                                        </div>

                                        <div className="rounded-xl border-2 border-slate-100 bg-white p-6 space-y-6 shadow-sm">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-bold text-slate-400">Teléfono</Label>
                                                    <p className="text-lg font-semibold text-slate-700">{form.getValues("telefono")}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-bold text-slate-400">Email</Label>
                                                    <p className="text-lg font-semibold text-slate-700">{form.getValues("email")}</p>
                                                </div>
                                            </div>
                                            <div className="pt-4 border-t border-slate-50">
                                                <Label className="text-[10px] uppercase font-bold text-slate-400">Nombres de los Padres</Label>
                                                <p className="text-lg font-bold text-primary">{form.getValues("padres")}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <Button variant="outline" type="button" className="flex-1 h-12" onClick={() => setStep("carga")}>
                                                Volver a Editar
                                            </Button>
                                            <Button type="submit" className="flex-1 h-12 text-base bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200">
                                                <Send className="mr-2 h-4 w-4" />
                                                Confirmar y Enviar
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                <p className="mt-8 text-center text-xs text-slate-400">
                    Tu conexión con NotiAr está cifrada de extremo a extremo para proteger tu privacidad.
                </p>
            </div>
        </div>
    );
}
