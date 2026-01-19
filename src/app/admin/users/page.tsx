"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Trash2, Search, Users, Clock, Shield, UserPlus } from "lucide-react";
import { getAllUsers, approveUser, rejectUser, deleteUser, getUserStats, preCreateUser } from "@/app/actions/admin";
import { toast } from "sonner";

type UserProfile = {
    id: string;
    email: string;
    full_name: string | null;
    approval_status: "pending" | "approved" | "rejected";
    created_at: string;
};

type FilterStatus = "all" | "pending" | "approved" | "rejected";

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterStatus>("all");
    const [search, setSearch] = useState("");
    const [stats, setStats] = useState<any>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({ email: "", fullName: "" });
    const [isInviting, setIsInviting] = useState(false);

    const loadData = async () => {
        setLoading(true);
        const [usersRes, statsRes] = await Promise.all([
            getAllUsers(),
            getUserStats(),
        ]);

        if (usersRes.success) {
            setUsers(usersRes.data);
            setFilteredUsers(usersRes.data);
        }

        if (statsRes.success) {
            setStats(statsRes.data);
        }

        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        let filtered = users;

        // Apply status filter
        if (filter !== "all") {
            filtered = filtered.filter(u => u.approval_status === filter);
        }

        // Apply search
        if (search) {
            filtered = filtered.filter(u =>
                u.email.toLowerCase().includes(search.toLowerCase()) ||
                u.full_name?.toLowerCase().includes(search.toLowerCase())
            );
        }

        setFilteredUsers(filtered);
    }, [filter, search, users]);

    const handleApprove = async (userId: string) => {
        const res = await approveUser(userId);
        if (res.success) {
            toast.success("Usuario aprobado");
            loadData();
        } else {
            toast.error(res.error || "Error al aprobar usuario");
        }
    };

    const handleReject = async (userId: string) => {
        const res = await rejectUser(userId);
        if (res.success) {
            toast.success("Usuario rechazado");
            loadData();
        } else {
            toast.error(res.error || "Error al rechazar usuario");
        }
    };

    const handleDeleteConfirm = async () => {
        if (!userToDelete) return;

        const res = await deleteUser(userToDelete.id);
        if (res.success) {
            toast.success("Usuario eliminado");
            loadData();
            setDeleteDialogOpen(false);
            setUserToDelete(null);
        } else {
            toast.error(res.error || "Error al eliminar usuario");
        }
    };

    const handleInvite = async () => {
        if (!inviteForm.email || !inviteForm.fullName) {
            toast.error("Complete todos los campos");
            return;
        }

        setIsInviting(true);
        const res = await preCreateUser(inviteForm.email, inviteForm.fullName);
        setIsInviting(false);

        if (res.success) {
            toast.success("Usuario pre-aprobado correctamente");
            setInviteDialogOpen(false);
            setInviteForm({ email: "", fullName: "" });
            loadData();
        } else {
            toast.error(res.error || "Error al invitar usuario");
        }
    };

    const getStatusBadge = (status: string) => {
        const configs: any = {
            pending: { label: "Pendiente", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
            approved: { label: "Aprobado", className: "bg-green-100 text-green-800 border-green-300" },
            rejected: { label: "Rechazado", className: "bg-red-100 text-red-800 border-red-300" },
        };
        const config = configs[status] || configs.pending;
        return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
    };

    const getRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        return `${diffDays}d`;
    };

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Shield className="h-8 w-8 text-blue-600" />
                        Panel de Administración
                    </h1>
                    <p className="text-muted-foreground">Gestión de usuarios del sistema</p>
                </div>
                <Button onClick={() => setInviteDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Pre-crear Empleado
                </Button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Usuarios</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-slate-600" />
                                <span className="text-2xl font-bold">{stats.total}</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-yellow-600" />
                                <span className="text-2xl font-bold text-yellow-600">{stats.pending}</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Aprobados</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-2xl font-bold text-green-600">{stats.approved}</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Rechazados</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-red-600" />
                                <span className="text-2xl font-bold text-red-600">{stats.rejected}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters and Search */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex gap-2">
                            <Button
                                variant={filter === "all" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setFilter("all")}
                            >
                                Todos
                            </Button>
                            <Button
                                variant={filter === "pending" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setFilter("pending")}
                            >
                                Pendientes
                            </Button>
                            <Button
                                variant={filter === "approved" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setFilter("approved")}
                            >
                                Aprobados
                            </Button>
                            <Button
                                variant={filter === "rejected" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setFilter("rejected")}
                            >
                                Rechazados
                            </Button>
                        </div>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Registrado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10">
                                        Cargando...
                                    </TableCell>
                                </TableRow>
                            ) : filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                        No se encontraron usuarios
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.email}</TableCell>
                                        <TableCell>{user.full_name || "-"}</TableCell>
                                        <TableCell>{getStatusBadge(user.approval_status)}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {getRelativeTime(user.created_at)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {user.approval_status === "pending" && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-green-600 hover:bg-green-50"
                                                            onClick={() => handleApprove(user.id)}
                                                        >
                                                            <CheckCircle className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-red-600 hover:bg-red-50"
                                                            onClick={() => handleReject(user.id)}
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                                {user.approval_status === "approved" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-red-600 hover:bg-red-50"
                                                        onClick={() => handleReject(user.id)}
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {user.approval_status === "rejected" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-green-600 hover:bg-green-50"
                                                        onClick={() => handleApprove(user.id)}
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-red-600 hover:bg-red-50"
                                                    onClick={() => {
                                                        setUserToDelete(user);
                                                        setDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Eliminar usuario?</DialogTitle>
                        <DialogDescription>
                            Estás a punto de eliminar permanentemente a <strong>{userToDelete?.email}</strong>.
                            Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm}>
                            Eliminar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Invite Dialog */}
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pre-crear / Invitar Empleado</DialogTitle>
                        <DialogDescription>
                            Permite que un nuevo empleado se registre y sea aprobado automáticamente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="invite-name">Nombre Completo</Label>
                            <Input
                                id="invite-name"
                                value={inviteForm.fullName}
                                onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                                placeholder="Ej: Maria Lopez"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="invite-email">Email</Label>
                            <Input
                                id="invite-email"
                                type="email"
                                value={inviteForm.email}
                                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                                placeholder="empleado@notaria.com"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleInvite} disabled={isInviting}>
                            {isInviting ? "Guardando..." : "Confirmar Pre-aprobación"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
