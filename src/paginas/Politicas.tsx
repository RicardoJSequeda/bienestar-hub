import { useEffect, useState } from "react";
import { supabase } from "@/servicios/cliente";
import { DashboardLayout } from "@/componentes/diseno/DisenoTablero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/componentes/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/componentes/ui/table";
import { toast } from "@/ganchos/usar-toast";
import { Plus, MoreVertical, Pencil, Trash2, FileText, Loader2, History } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/componentes/ui/dropdown-menu";
import { Badge } from "@/componentes/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Policy {
    id: string;
    title: string;
    content: string | null;
    is_active: boolean;
    created_at: string;
}

export default function AdminPolicies() {
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        title: "",
        content: "",
        is_active: true
    });

    useEffect(() => {
        fetchPolicies();
    }, []);

    const fetchPolicies = async () => {
        const { data, error } = await supabase
            .from("institutional_policies")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            toast({ title: "Error", description: "No se pudieron cargar las políticas", variant: "destructive" });
        } else {
            setPolicies(data || []);
        }
        setIsLoading(false);
    };

    const handleOpenDialog = (policy?: Policy) => {
        if (policy) {
            setEditingPolicy(policy);
            setFormData({
                title: policy.title,
                content: policy.content || "",
                is_active: policy.is_active
            });
        } else {
            setEditingPolicy(null);
            setFormData({
                title: "",
                content: "",
                is_active: true
            });
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.title.trim() || !formData.content.trim()) {
            toast({ title: "Error", description: "Título y contenido son obligatorios", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        const policyData = {
            title: formData.title.trim(),
            content: formData.content.trim(),
            is_active: formData.is_active
        };

        let error;
        if (editingPolicy) {
            ({ error } = await supabase
                .from("institutional_policies")
                .update(policyData as any)
                .eq("id", editingPolicy.id));
        } else {
            ({ error } = await supabase
                .from("institutional_policies")
                .insert(policyData as any));
        }

        if (error) {
            toast({ title: "Error", description: "No se pudo guardar la política", variant: "destructive" });
        } else {
            toast({ title: "Éxito", description: editingPolicy ? "Política actualizada" : "Política creada" });
            setIsDialogOpen(false);
            fetchPolicies();
        }
        setIsSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar esta política?")) return;

        const { error } = await supabase
            .from("institutional_policies")
            .delete()
            .eq("id", id);

        if (error) {
            toast({ title: "Error", description: "No se pudo eliminar la política", variant: "destructive" });
        } else {
            toast({ title: "Eliminado", description: "Política eliminada correctamente" });
            fetchPolicies();
        }
    };

    const toggleActive = async (policy: Policy) => {
        const { error } = await supabase
            .from("institutional_policies")
            .update({ is_active: !policy.is_active } as any)
            .eq("id", policy.id);

        if (error) {
            toast({ title: "Error", description: "No se pudo actualizar el estado", variant: "destructive" });
        } else {
            fetchPolicies();
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Políticas Institucionales</h1>
                        <p className="text-muted-foreground">Gestiona las normativas y reglas del bienestar universitario</p>
                    </div>
                    <Button onClick={() => handleOpenDialog()}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Política
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Listado de Políticas
                        </CardTitle>
                        <CardDescription>
                            Todas las políticas registradas en el sistema que rigen préstamos y eventos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Título</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Última Actualización</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {policies.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                No hay políticas registradas
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        policies.map((policy) => (
                                            <TableRow key={policy.id}>
                                                <TableCell>
                                                    <div className="font-medium">{policy.title}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={policy.is_active ? "default" : "secondary"}
                                                        className="cursor-pointer"
                                                        onClick={() => toggleActive(policy)}
                                                    >
                                                        {policy.is_active ? "Activa" : "Inactiva"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {format(new Date(policy.created_at), "PPP", { locale: es })}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleOpenDialog(policy)}>
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                Editar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(policy.id)}>
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Eliminar
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingPolicy ? "Editar Política" : "Nueva Política"}
                            </DialogTitle>
                            <DialogDescription>
                                Describe las reglas y condiciones. Los cambios afectarán a los nuevos procesos.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Título de la Política *</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Ej: Reglamento de Gimnasio"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="content">Contenido de la Política *</Label>
                                <Textarea
                                    id="content"
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="Detalla aquí todas las reglas y condiciones..."
                                    className="min-h-[200px]"
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                />
                                <Label htmlFor="is_active">Política Activa</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingPolicy ? "Guardar Cambios" : "Crear Política"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
