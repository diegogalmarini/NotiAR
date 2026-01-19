"use client";

import { useState, useOptimistic, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Activity, Users, Home, UserPlus, Link as LinkIcon, Plus, FileSignature, ClipboardCheck, Trash2 } from "lucide-react";
import { PersonSearch } from "./PersonSearch";
import { AssetSearch } from "./AssetSearch";
import { DeedEditor } from "./DeedEditor";
import { StatusStepper } from "./StatusStepper";
import { MinutaGenerator } from "./MinutaGenerator";
import { AMLCompliance } from "./AMLCompliance";
import { InscriptionTracker } from "./InscriptionTracker";
import { linkPersonToOperation, linkAssetToDeed, addOperationToDeed, deleteCarpeta } from "@/app/actions/carpeta";
import { ClientOutreach } from "./ClientOutreach";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
import { useRouter } from "next/navigation";

export default function FolderWorkspace({ initialData }: { initialData: any }) {
    const [carpeta, setCarpeta] = useState(initialData);
    const [isPersonSearchOpen, setIsPersonSearchOpen] = useState(false);
    const [isAssetSearchOpen, setIsAssetSearchOpen] = useState(false);
    const [activeOpId, setActiveOpId] = useState<string | null>(null);
    const [activeDeedId, setActiveDeedId] = useState<string | null>(carpeta.escrituras[0]?.id || null);
    const [isPending, startTransition] = useTransition();
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    // Optimistic participants
    const [optimisticOps, addOptimisticParticipant] = useOptimistic(
        carpeta.escrituras.find((e: any) => e.id === activeDeedId)?.operaciones || [],
        (state: any, newParticipant: any) => {
            return state.map((op: any) => {
                if (op.id === newParticipant.operacion_id) {
                    return {
                        ...op,
                        participantes_operacion: [...(op.participantes_operacion || []), newParticipant]
                    };
                }
                return op;
            });
        }
    );

    const handleLinkAsset = async (assetId: string) => {
        if (!activeDeedId) return;
        const res = await linkAssetToDeed(activeDeedId, assetId);
        if (res.success) {
            toast.success("Inmueble vinculado correctamente");
            window.location.reload();
        } else {
            toast.error(res.error);
        }
    };

    const handleLinkPerson = async (personId: string) => {
        if (!activeOpId) return;

        startTransition(async () => {
            addOptimisticParticipant({
                operacion_id: activeOpId,
                persona_id: personId,
                rol: "COMPRADOR",
                personas: { nombre_completo: "Cargando..." }
            });

            const res = await linkPersonToOperation(activeOpId, personId, "COMPRADOR");
            if (res.success) {
                toast.success("Persona vinculada");
                window.location.reload();
            } else {
                toast.error(res.error);
            }
        });
    };

    const handleDeleteFolder = async () => {
        setIsDeleting(true);
        const res = await deleteCarpeta(carpeta.id);
        setIsDeleting(false);

        if (res.success) {
            toast.success("Carpeta eliminada correctamente");
            router.push("/dashboard");
        } else {
            toast.error(res.error || "Error al eliminar la carpeta");
        }
    };

    const currentEscritura = carpeta.escrituras.find((e: any) => e.id === activeDeedId);

    return (
        <Tabs defaultValue="mesa" className="w-full">
            <div className="flex justify-between items-center mb-6">
                <TabsList className={`grid w-fit ${carpeta.estado === 'FIRMADA' || carpeta.estado === 'INSCRIPTA' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                    <TabsTrigger value="mesa" className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Mesa de Trabajo
                    </TabsTrigger>
                    <TabsTrigger value="draft" className="flex items-center gap-2">
                        <FileSignature className="h-4 w-4" />
                        Redacción
                    </TabsTrigger>
                    <TabsTrigger value="compliance" className="flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        Minutas
                    </TabsTrigger>
                    {(carpeta.estado === 'FIRMADA' || carpeta.estado === 'INSCRIPTA') && (
                        <TabsTrigger value="inscription" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Inscripción
                        </TabsTrigger>
                    )}
                </TabsList>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="px-3 py-1 bg-slate-50 font-mono text-[10px]">
                        ID: {carpeta.id.slice(0, 8)}
                    </Badge>
                    <StatusStepper folderId={carpeta.id} currentStatus={carpeta.estado} />

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro de eliminar esta carpeta?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se borrarán todos los documentos,
                                    operaciones y participantes vinculados a este trámite ({carpeta.caratula || "Sin título"}).
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDeleteFolder}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? "Eliminando..." : "Eliminar Definitivamente"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            <TabsContent value="mesa">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <PersonSearch
                        open={isPersonSearchOpen}
                        setOpen={setIsPersonSearchOpen}
                        onSelect={handleLinkPerson}
                    />
                    <AssetSearch
                        open={isAssetSearchOpen}
                        setOpen={setIsAssetSearchOpen}
                        onSelect={handleLinkAsset}
                    />

                    {/* Sidebar: Deeds List */}
                    <div className="lg:col-span-4 space-y-6">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            Escrituras
                        </h2>
                        {carpeta.escrituras.map((escritura: any) => (
                            <Card
                                key={escritura.id}
                                className={cn(
                                    "cursor-pointer transition-all hover:shadow-md",
                                    activeDeedId === escritura.id ? "ring-2 ring-primary" : "opacity-80"
                                )}
                                onClick={() => setActiveDeedId(escritura.id)}
                            >
                                <CardHeader className="p-4">
                                    <CardTitle className="text-base flex justify-between">
                                        Protocolo #{escritura.nro_protocolo || "Draft"}
                                    </CardTitle>
                                    <CardDescription>
                                        {escritura.fecha_escritura || "Fecha pendiente"}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <div className="rounded-md border bg-slate-50 p-2 flex items-center justify-between">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <Home className="h-3 w-3 text-muted-foreground shrink-0" />
                                            <p className="text-xs truncate font-medium">
                                                {escritura.inmuebles ? `${escritura.inmuebles.partido_id} - ${escritura.inmuebles.nro_partida}` : "Sin inmueble vincul."}
                                            </p>
                                        </div>
                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveDeedId(escritura.id);
                                            setIsAssetSearchOpen(true);
                                        }}>
                                            <LinkIcon className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Main Content: Acts and Participants */}
                    <div className="lg:col-span-8 space-y-6">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Activity className="h-5 w-5 text-muted-foreground" />
                            Actos y Participantes
                        </h2>

                        {optimisticOps.map((op: any) => (
                            <Card key={op.id}>
                                <CardHeader className="pb-3 border-b mb-4 bg-muted/20">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle className="text-lg font-bold text-primary">{op.tipo_acto}</CardTitle>
                                            <CardDescription>Monto: ${op.monto_operacion || "0.00"}</CardDescription>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => {
                                            setActiveOpId(op.id);
                                            setIsPersonSearchOpen(true);
                                        }}>
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            Vincular Persona
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-extrabold flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                Transmitentes
                                            </Label>
                                            <div className="space-y-2">
                                                {op.participantes_operacion
                                                    ?.filter((p: any) => p.rol === "VENDEDOR")
                                                    .map((p: any) => (
                                                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-white shadow-sm ring-red-50 hover:ring-2 transition-all">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-semibold">{p.personas.nombre_completo}</span>
                                                                <span className="text-[10px] text-muted-foreground">CUIL: {p.persona_id}</span>
                                                            </div>
                                                            <ClientOutreach personId={p.persona_id} personName={p.personas.nombre_completo} />
                                                        </div>
                                                    ))}
                                                {op.participantes_operacion?.filter((p: any) => p.rol === "VENDEDOR").length === 0 && (
                                                    <div className="p-3 border border-dashed rounded-lg text-center">
                                                        <p className="text-xs text-muted-foreground italic">Ningún transmitente asignado</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-extrabold flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                Adquirentes
                                            </Label>
                                            <div className="space-y-2">
                                                {op.participantes_operacion
                                                    ?.filter((p: any) => p.rol === "COMPRADOR")
                                                    .map((p: any) => (
                                                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-white shadow-sm ring-blue-50 hover:ring-2 transition-all">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-semibold">{p.personas.nombre_completo}</span>
                                                                <span className="text-[10px] text-muted-foreground">CUIL: {p.persona_id}</span>
                                                            </div>
                                                            <ClientOutreach personId={p.persona_id} personName={p.personas.nombre_completo} />
                                                        </div>
                                                    ))}
                                                {op.participantes_operacion?.filter((p: any) => p.rol === "COMPRADOR").length === 0 && (
                                                    <div className="p-3 border border-dashed rounded-lg text-center">
                                                        <p className="text-xs text-muted-foreground italic">Ningún adquirente asignado</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="draft" className="h-[calc(100vh-250px)]">
                {activeDeedId ? (
                    <DeedEditor
                        escrituraId={activeDeedId}
                        initialContent={currentEscritura?.contenido_borrador}
                        dataSummary={currentEscritura}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full border-2 border-dashed rounded-xl">
                        <p className="text-muted-foreground">Seleccione una escritura para redactar</p>
                    </div>
                )}
            </TabsContent>
            <TabsContent value="compliance">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <MinutaGenerator data={currentEscritura} />
                    <AMLCompliance escrituraId={activeDeedId!} />
                </div>
            </TabsContent>
            <TabsContent value="inscription">
                <InscriptionTracker data={currentEscritura} />
            </TabsContent>
        </Tabs>
    );
}
