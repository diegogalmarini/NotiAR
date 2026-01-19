import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, FileText, Shield, ArrowRight, History } from "lucide-react";
import { createFolder } from "@/app/actions/carpeta";
import { revalidatePath } from "next/cache";
import { ExpiringDeedsAlert } from "@/components/ExpiringDeedsAlert";
import { MagicDropzone } from "@/components/MagicDropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DeleteFolderButton } from "@/components/DeleteFolderButton";

export default async function DashboardPage() {
    const { data: carpetas, error } = await supabase
        .from("carpetas")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(10);

    return (
        <div className="p-8 space-y-10 animate-in fade-in duration-700">
            {/* Header section with Welcome and quick actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
                        Bienvenido, Notario
                    </h1>
                    <p className="text-lg text-slate-500 mt-1">
                        Tu central de operaciones y gestión registral.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" asChild>
                        <Link href="/admin/users">
                            <Shield className="mr-2 h-4 w-4" />
                            Admin
                        </Link>
                    </Button>
                    <form action={async () => {
                        "use server";
                        await createFolder("Nueva Carpeta Manual");
                        revalidatePath("/dashboard");
                    }}>
                        <Button className="shadow-lg shadow-primary/20">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nueva Carpeta
                        </Button>
                    </form>
                </div>
            </div>

            {/* Magic Section - Hero Area */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <MagicDropzone />
                </div>
                <div className="flex flex-col gap-6">
                    <Card className="flex-1 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <History size={20} className="text-primary" />
                                Acceso Rápido
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-slate-400 text-sm">
                                Continúa trabajando en tus expedientes más recientes o crea uno nuevo manualmente.
                            </p>
                            <div className="space-y-2">
                                {carpetas?.slice(0, 3).map(c => (
                                    <Link
                                        key={c.id}
                                        href={`/carpeta/${c.id}`}
                                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                                    >
                                        <div className="truncate pr-4">
                                            <div className="text-sm font-medium truncate">{c.caratula || "Sin título"}</div>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Carpeta #{c.nro_carpeta_interna}</div>
                                        </div>
                                        <ArrowRight size={14} className="text-slate-600 group-hover:text-primary transition-colors" />
                                    </Link>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Alerts Section */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-xl font-bold text-slate-800">Alertas de Vencimiento</h2>
                </div>
                <ExpiringDeedsAlert />
            </section>

            {/* Recent Folders List */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800">Últimas Carpetas Modificadas</h2>
                    <Button variant="link" asChild>
                        <Link href="/carpetas">Ver todas</Link>
                    </Button>
                </div>
                <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[100px]">ID</TableHead>
                                <TableHead>Carátula / Operación</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Última Actividad</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {carpetas?.map((carpeta) => (
                                <TableRow key={carpeta.id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        #{carpeta.nro_carpeta_interna}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-semibold text-slate-900">
                                            {carpeta.caratula || "Sin carátula"}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={carpeta.estado === "ABIERTA" ? "secondary" : "default"}
                                            className={cn(
                                                carpeta.estado === "FIRMADA" && "bg-green-100 text-green-700 hover:bg-green-200 border-none",
                                                carpeta.estado === "EN_REDACCION" && "bg-blue-100 text-blue-700 hover:bg-blue-200 border-none"
                                            )}
                                        >
                                            {carpeta.estado}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-500">
                                        {new Date(carpeta.updated_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild className="hover:text-primary">
                                            <Link href={`/carpeta/${carpeta.id}`}>
                                                <FileText className="h-4 w-4 mr-2" />
                                                Abrir
                                            </Link>
                                        </Button>
                                        <DeleteFolderButton folderId={carpeta.id} folderName={carpeta.caratula} />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!carpetas || carpetas.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                                        <History className="mx-auto h-12 w-12 opacity-10 mb-4" />
                                        Todavía no hay carpetas creadas.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </section>
        </div>
    );
}
