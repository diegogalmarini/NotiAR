import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, Mail } from "lucide-react";

export default function PendingApprovalPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                        <Clock className="h-6 w-6 text-amber-600" />
                    </div>
                    <CardTitle className="text-2xl">Aprobación Pendiente</CardTitle>
                    <CardDescription>
                        Tu cuenta está siendo revisada
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex gap-3">
                            <Mail className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-900">
                                <p className="font-medium mb-1">Registro exitoso</p>
                                <p>
                                    Hemos recibido tu solicitud de acceso. Un administrador
                                    revisará tu cuenta y te notificaremos por email cuando
                                    esté aprobada.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="text-sm text-muted-foreground text-center space-y-2">
                        <p>Este proceso suele tomar entre 24-48 horas hábiles.</p>
                        <p>Si tienes consultas, contacta al administrador del sistema.</p>
                    </div>

                    <Button asChild variant="outline" className="w-full">
                        <Link href="/login">
                            Volver al Login
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
