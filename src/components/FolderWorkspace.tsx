"use client";

import { useState, useOptimistic, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Activity, Users, Home, UserPlus, Link as LinkIcon, Plus, FileSignature, ClipboardCheck, Trash2, Pencil, UserMinus, Download, Eye } from "lucide-react";
import { PersonSearch } from "./PersonSearch";
import { PersonForm } from "./PersonForm";
import { AssetSearch } from "./AssetSearch";
import { DeedEditor } from "./DeedEditor";
import { StatusStepper } from "./StatusStepper";
import { MinutaGenerator } from "./MinutaGenerator";
import { AMLCompliance } from "./AMLCompliance";
import { InscriptionTracker } from "./InscriptionTracker";
import { linkPersonToOperation, linkAssetToDeed, addOperationToDeed, deleteCarpeta, unlinkPersonFromOperation } from "@/app/actions/carpeta";
import { ClientOutreach } from "./ClientOutreach";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { cn, formatDateInstructions } from "@/lib/utils";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

export default function FolderWorkspace({ initialData }: { initialData: any }) {
    const [carpeta, setCarpeta] = useState(initialData);
    const [isPersonSearchOpen, setIsPersonSearchOpen] = useState(false);
    const [isAssetSearchOpen, setIsAssetSearchOpen] = useState(false);
    const [activeOpId, setActiveOpId] = useState<string | null>(null);

    console.log("📂 FolderWorkspace Initial Data:", JSON.stringify(initialData, null, 2));
    const [activeDeedId, setActiveDeedId] = useState<string | null>(carpeta.escrituras[0]?.id || null);
    const [isPending, startTransition] = useTransition();
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingPerson, setEditingPerson] = useState<any>(null);
    const router = useRouter();

    // Optimistic participants
    const [optimisticOps, addOptimisticParticipant] = useOptimistic(
        carpeta.escrituras.find((e: any) => e.id === activeDeedId)?.operaciones || [],
        (state: any, newParticipant: any) => {
            return state.map((op: any) => {
                if (op.id === newParticipant.operacion_id) {
                    const existing = op.participantes_operacion || [];
                    return {
                        ...op,
                        participantes_operacion: [...existing, newParticipant]
                    };
                }
                return op;
            });
        }
    );

    console.log("💎 OPTIMISTIC OPS:", optimisticOps);

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
                persona: { nombre_completo: "Cargando..." }
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

    const handleUnlinkPerson = async (participanteId: string) => {
        const res = await unlinkPersonFromOperation(participanteId);
        if (res.success) {
            toast.success("Participante desvinculado");
            router.refresh();
        } else {
            toast.error("Error: " + res.error);
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
                                    activeDeedId === escritura.id ? "shadow-lg border-slate-300" : "opacity-80"
                                )}
                                onClick={() => setActiveDeedId(escritura.id)}
                            >
                                <CardHeader className="p-4 pb-2">
                                    <CardTitle className="text-sm font-semibold text-slate-700">Datos actuales de Documento Original</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-2">
                                    <div className="space-y-2.5 text-xs">
                                        {/* Partido y Partida */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase text-slate-400">Partido / Dpto</p>
                                                <p className="text-slate-700">{escritura.inmuebles?.partido_id || "No especificado"}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase text-slate-400">Nro. Partida</p>
                                                <p className="text-slate-700">{escritura.inmuebles?.nro_partida || "No especificado"}</p>
                                            </div>
                                        </div>

                                        {/* Tipo de Acto y Número */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase text-slate-400">Tipo de Acto</p>
                                                <p className="text-slate-700">{escritura.operaciones?.[0]?.tipo_acto || "COMPRAVENTA"}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase text-slate-400">Nº de Acto</p>
                                                <p className="text-slate-700">{escritura.operaciones?.[0]?.nro_acto || "No especificado"}</p>
                                            </div>
                                        </div>

                                        {/* Escritura Nº y Fecha */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase text-slate-400">Escritura Nº</p>
                                                <p className="text-slate-700">{escritura.nro_protocolo || "Draft"}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase text-slate-400">Fecha</p>
                                                <p className="text-slate-700">
                                                    {escritura.fecha_escritura ?
                                                        new Date(escritura.fecha_escritura + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
                                                        : "Fecha pendiente"}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Escribano */}
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase text-slate-400">Escribano</p>
                                            <p className="text-slate-700">{escritura.notario_interviniente || "No especificado"}</p>
                                        </div>


                                        {/* Registro */}
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase text-slate-400">Registro número</p>
                                            <p className="text-slate-700">{escritura.registro || "No especificado"}</p>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-[10px] font-medium text-slate-700 gap-1.5"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Eye className="h-3 w-3" />
                                                Ver Documento
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-[10px] font-medium text-slate-700 gap-1.5"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Download className="h-3 w-3" />
                                                Descargar
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {carpeta.escrituras.length === 0 && (
                            <div className="p-8 text-center bg-slate-50 border-2 border-dashed rounded-xl">
                                <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-sm text-slate-500 font-medium">No hay escrituras</p>
                            </div>
                        )}
                    </div>



                    {/* Main Content: Participant Cards */}
                    <div className="lg:col-span-8">
                        {/* Direct Grid of Participant Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {optimisticOps.flatMap((op: any) =>
                                op.participantes_operacion?.map((p: any) => (
                                    <Card key={p.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="px-3 py-1.5 border-b flex justify-between items-center bg-slate-50 text-slate-600">
                                            <span className="text-[10px] font-medium uppercase tracking-wide">{p.rol === 'VENDEDOR' ? 'Transmitente' : 'Adquirente'}</span>
                                            <Badge variant="outline" className="text-[9px] bg-white">{p.persona_id}</Badge>
                                        </div>
                                        {(() => {
                                            const person = p.persona || p.personas;
                                            if (!person) return <p className="text-red-500 text-xs text-center py-4">Error: Datos de persona no vinculados</p>;

                                            return (
                                                <div className="p-4 space-y-4">
                                                    {/* Header with Name and Actions */}
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="space-y-1 overflow-hidden">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-lg font-semibold text-slate-700 leading-tight truncate">{person.nombre_completo}</p>
                                                                <Badge variant="secondary" className="text-[10px] font-medium py-0 h-5 shrink-0 bg-slate-100 text-slate-600">
                                                                    {p.rol === 'VENDEDOR' ? 'Transmitente' : 'Adquirente'}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-[11px] font-mono text-slate-400">DNI: {person.tax_id || person.dni || p.persona_id}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-9 w-9 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                                onClick={(e) => { e.stopPropagation(); setEditingPerson(person); }}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                                onClick={(e) => { e.stopPropagation(); handleUnlinkPerson(p.id); }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {/* Body: Notary Details */}
                                                    <div className="grid grid-cols-1 gap-2.5 pt-3 border-t border-slate-100">
                                                        {/* Nationality and Birth */}
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex gap-4">
                                                                <div className="space-y-0.5">
                                                                    <p className="text-[9px] font-black uppercase text-slate-400 leading-none">Nacionalidad</p>
                                                                    <p className="text-xs text-slate-600">{person.nacionalidad || "No consta"}</p>
                                                                </div>
                                                                <div className="space-y-0.5">
                                                                    <p className="text-[9px] font-semibold uppercase text-slate-400 leading-none">Nacimiento</p>
                                                                    <p className="text-xs text-slate-600">{formatDateInstructions(person.fecha_nacimiento)}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Address */}
                                                        <div className="flex items-start gap-3">
                                                            <div className="space-y-0.5">
                                                                <p className="text-[9px] font-black uppercase text-slate-400 leading-none">Domicilio Real</p>
                                                                <p className="text-xs text-slate-700 font-medium leading-tight italic">
                                                                    {person.domicilio_real?.literal || "No consta en el documento"}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Marital Status and Spouse */}
                                                        <div className="flex items-start gap-3">
                                                            <div className="space-y-1">
                                                                <div className="space-y-0.5">
                                                                    <p className="text-[9px] font-black uppercase text-slate-400 leading-none">Estado Civil</p>
                                                                    <p className="text-xs text-slate-600 leading-tight">
                                                                        {person.estado_civil_detalle || person.estado_civil || person.estado_civil_detallado?.estado || "No consta"}
                                                                    </p>
                                                                </div>
                                                                {person.datos_conyuge?.nombre && (
                                                                    <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 border border-slate-100 rounded">
                                                                        <span className="text-[10px] font-bold text-indigo-600">Cónyuge:</span>
                                                                        <span className="text-xs text-slate-700 font-medium">{person.datos_conyuge.nombre}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Parents (Filiation) */}
                                                        <div className="flex items-start gap-3">
                                                            <div className="space-y-0.5">
                                                                <p className="text-[9px] font-black uppercase text-slate-400 leading-none">Hijo de:</p>
                                                                <p className="text-xs text-slate-700 font-bold leading-tight">
                                                                    {person.nombres_padres || person.estado_civil_detallado?.padres || "No informado"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Footer Action */}
                                                    <div className="pt-2 border-t border-slate-50 flex justify-end">
                                                        <ClientOutreach personId={p.persona_id} personName={person.nombre_completo} />
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="draft" className="h-[calc(100vh-180px)] overflow-hidden">
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

            {/* Editing Person Modal */}
            < Dialog open={!!editingPerson} onOpenChange={() => setEditingPerson(null)}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Editar Persona</DialogTitle>
                        <DialogDescription>
                            Modifica los datos personales y filiatorios. Los cambios se aplicarán globalmente.
                        </DialogDescription>
                    </DialogHeader>
                    {editingPerson && (
                        <PersonForm
                            initialData={editingPerson}
                            onSuccess={() => {
                                setEditingPerson(null);
                                router.refresh();
                            }}
                            onCancel={() => setEditingPerson(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </Tabs>
    );
}
