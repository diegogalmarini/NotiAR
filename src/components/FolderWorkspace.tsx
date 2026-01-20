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
import { updateEscritura, updateOperacion, updateInmueble } from "@/app/actions/escritura";
import { ClientOutreach } from "./ClientOutreach";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
    const [showTranscriptionDialog, setShowTranscriptionDialog] = useState(false);
    const [editingDeed, setEditingDeed] = useState<any>(null);
    const [viewingDocument, setViewingDocument] = useState<string | null>(null);

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
                                <CardHeader className="p-4 pb-0">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-semibold text-slate-700">Datos actuales de Documento Original</CardTitle>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingDeed({
                                                    ...escritura,
                                                    operacion: escritura.operaciones?.[0]
                                                });
                                            }}
                                        >
                                            <Pencil className="h-3 w-3 text-slate-500" />
                                        </Button>
                                    </div>
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
                                        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-[10px] font-medium text-slate-700 gap-1.5"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (escritura.pdf_url) {
                                                        setViewingDocument(escritura.pdf_url);
                                                    } else {
                                                        toast.error("No hay documento disponible");
                                                    }
                                                }}
                                            >
                                                <Eye className="h-3 w-3" />
                                                Ver Documento
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-[10px] font-medium text-slate-700 gap-1.5"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (escritura.pdf_url) {
                                                        window.open(escritura.pdf_url, '_blank');
                                                    } else {
                                                        toast.error("No hay documento para descargar");
                                                    }
                                                }}
                                            >
                                                <Download className="h-3 w-3" />
                                                Descargar
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-[10px] font-medium text-slate-700 gap-1.5"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowTranscriptionDialog(true);
                                                }}
                                            >
                                                <FileText className="h-3 w-3" />
                                                Transcripción
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
                                        {/* Header: Role + Actions */}
                                        <div className="px-4 py-2 border-b flex justify-between items-center bg-slate-50">
                                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                                                {p.rol === 'VENDEDOR' ? 'Transmitente' : 'Adquirente'}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                    onClick={(e) => { e.stopPropagation(); setEditingPerson(p.persona || p.personas); }}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                    onClick={(e) => { e.stopPropagation(); handleUnlinkPerson(p.id); }}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>

                                        {(() => {
                                            const person = p.persona || p.personas;
                                            if (!person) return <p className="text-red-500 text-xs text-center py-4">Error: Datos de persona no vinculados</p>;

                                            return (
                                                <div className="p-4 space-y-2">
                                                    {/* Full Name */}
                                                    <h3 className="text-base font-bold text-slate-800">{person.nombre_completo}</h3>

                                                    {/* DNI y CUIT Grid */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <p className="text-[10px] font-semibold uppercase text-slate-400">DNI</p>
                                                            <p className="text-sm text-slate-700">{person.dni || p.persona_id}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-semibold uppercase text-slate-400">CUIT / CUIL</p>
                                                            <p className="text-sm text-slate-700">{person.cuit || "No informado"}</p>
                                                        </div>
                                                    </div>

                                                    {/* Nacionalidad y Nacimiento */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <p className="text-[10px] font-semibold uppercase text-slate-400">Nacionalidad</p>
                                                            <p className="text-sm text-slate-700">{person.nacionalidad || "No informado"}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-semibold uppercase text-slate-400">Nacimiento</p>
                                                            <p className="text-sm text-slate-700">{formatDateInstructions(person.fecha_nacimiento)}</p>
                                                        </div>
                                                    </div>

                                                    {/* Domicilio Real */}
                                                    <div>
                                                        <p className="text-[10px] font-semibold uppercase text-slate-400">Domicilio Real</p>
                                                        <p className="text-sm text-slate-700 italic">
                                                            {person.domicilio_real?.literal || "No consta en el documento"}
                                                        </p>
                                                    </div>

                                                    {/* Estado Civil - Párrafo completo literal */}
                                                    <div>
                                                        <p className="text-[10px] font-semibold uppercase text-slate-400">Estado Civil</p>
                                                        <p className="text-sm text-slate-700">
                                                            {person.estado_civil_detalle || person.estado_civil || "No informado"}
                                                        </p>
                                                    </div>

                                                    {/* Cónyuge e Hijo de - Misma línea */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <p className="text-[10px] font-semibold uppercase text-slate-400">Cónyuge</p>
                                                            <p className="text-sm text-slate-700">
                                                                {person.datos_conyuge?.nombre || "No informado"}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-semibold uppercase text-slate-400">Hijo de:</p>
                                                            <p className="text-sm text-slate-700">
                                                                {person.nombres_padres || person.estado_civil_detallado?.padres || "No informado"}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Footer Action */}
                                                    <div className="pt-2 border-t border-slate-100">
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
            </TabsContent >

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
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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

            {/* Transcription Dialog */}
            <Dialog open={showTranscriptionDialog} onOpenChange={setShowTranscriptionDialog}>
                <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Transcripción Literal Completa del Inmueble</DialogTitle>
                        <DialogDescription>
                            Descripción técnica completa del inmueble extraída del documento original.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                        {currentEscritura?.inmuebles?.transcripcion_literal ? (
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                    {currentEscritura.inmuebles.transcripcion_literal}
                                </p>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-500">
                                <p className="text-sm">No hay transcripción literal disponible para este documento.</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Deed Metadata Dialog */}
            <Dialog open={!!editingDeed} onOpenChange={() => setEditingDeed(null)}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Editar Datos del Documento</DialogTitle>
                        <DialogDescription>
                            Modifica los metadatos extraídos por IA. Los cambios se guardarán en la base de datos.
                        </DialogDescription>
                    </DialogHeader>
                    {editingDeed && (
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);

                                // Update escritura
                                const escrituraResult = await updateEscritura(editingDeed.id, {
                                    nro_protocolo: formData.get("nro_protocolo") ? parseInt(formData.get("nro_protocolo") as string) : null,
                                    fecha_escritura: formData.get("fecha_escritura") as string || null,
                                    notario_interviniente: formData.get("notario_interviniente") as string || null,
                                    registro: formData.get("registro") as string || null,
                                });

                                // Update operacion
                                if (editingDeed.operacion?.id) {
                                    await updateOperacion(editingDeed.operacion.id, {
                                        tipo_acto: formData.get("tipo_acto") as string,
                                        nro_acto: formData.get("nro_acto") as string || null,
                                    });
                                }

                                // Update inmueble
                                if (editingDeed.inmuebles?.id) {
                                    await updateInmueble(editingDeed.inmuebles.id, {
                                        partido_id: formData.get("partido_id") as string,
                                        nro_partida: formData.get("nro_partida") as string,
                                    });
                                }

                                if (escrituraResult.success) {
                                    toast.success("Datos actualizados correctamente");
                                    setEditingDeed(null);
                                    router.refresh();
                                } else {
                                    toast.error("Error al actualizar: " + escrituraResult.error);
                                }
                            }}
                            className="space-y-4 mt-4"
                        >
                            {/* Inmueble Data */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-slate-700">Datos del Inmueble</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="partido_id">Partido / Dpto</Label>
                                        <Input
                                            id="partido_id"
                                            name="partido_id"
                                            defaultValue={editingDeed.inmuebles?.partido_id || ""}
                                            placeholder="Ej: Bahía Blanca"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="nro_partida">Nro. Partida</Label>
                                        <Input
                                            id="nro_partida"
                                            name="nro_partida"
                                            defaultValue={editingDeed.inmuebles?.nro_partida || ""}
                                            placeholder="Ej: 186.636"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Operacion Data */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-slate-700">Datos de la Operación</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="tipo_acto">Tipo de Acto</Label>
                                        <Input
                                            id="tipo_acto"
                                            name="tipo_acto"
                                            defaultValue={editingDeed.operacion?.tipo_acto || "COMPRAVENTA"}
                                            placeholder="Ej: COMPRAVENTA"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="nro_acto">Nº de Acto (Código)</Label>
                                        <Input
                                            id="nro_acto"
                                            name="nro_acto"
                                            defaultValue={editingDeed.operacion?.nro_acto || ""}
                                            placeholder="Ej: 100-00"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Escritura Data */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-slate-700">Datos de la Escritura</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="nro_protocolo">Escritura Nº</Label>
                                        <Input
                                            id="nro_protocolo"
                                            name="nro_protocolo"
                                            type="number"
                                            defaultValue={editingDeed.nro_protocolo || ""}
                                            placeholder="Ej: 240"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="fecha_escritura">Fecha</Label>
                                        <Input
                                            id="fecha_escritura"
                                            name="fecha_escritura"
                                            type="date"
                                            defaultValue={editingDeed.fecha_escritura || ""}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="notario_interviniente">Escribano</Label>
                                    <Input
                                        id="notario_interviniente"
                                        name="notario_interviniente"
                                        defaultValue={editingDeed.notario_interviniente || ""}
                                        placeholder="Nombre completo del escribano"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="registro">Registro número</Label>
                                    <Input
                                        id="registro"
                                        name="registro"
                                        defaultValue={editingDeed.registro || ""}
                                        placeholder="Ej: Registro 30 de Bahía Blanca"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingDeed(null)}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit">
                                    Guardar Cambios
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Document Viewer Dialog - Fullscreen */}
            <Dialog open={!!viewingDocument} onOpenChange={() => setViewingDocument(null)}>
                <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full p-0">
                    <div className="relative w-full h-full">
                        {/* Close Button */}
                        <button
                            onClick={() => setViewingDocument(null)}
                            className="absolute top-2 right-2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-slate-100 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Document Viewer using Google Docs Viewer */}
                        {viewingDocument && (
                            <iframe
                                src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewingDocument)}&embedded=true`}
                                className="w-full h-full border-0"
                                title="Document Viewer"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Tabs >
    );
}
