import { useEffect, useState } from "react";
import { supabase } from "@/servicios/cliente";
import { DashboardLayout } from "@/componentes/diseno/DisenoTablero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";
import { Switch } from "@/componentes/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/componentes/ui/dropdown-menu";
import { toast } from "@/ganchos/usar-toast";
import { Plus, MoreVertical, Pencil, Trash2, Settings, Package, Calendar, Loader2, Cog, ShieldCheck } from "lucide-react";
import { SystemSettingsPanel } from "@/componentes/configuracion/PanelConfiguracionSistema";
import { ImageUpload } from "@/componentes/ui/ImageUpload";
import { Badge } from "@/componentes/ui/badge";

interface ResourceCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  image_url?: string | null;
  base_wellness_hours: number;
  hourly_factor: number;
  is_low_risk: boolean | null;
  requires_approval: boolean | null;
  max_loan_days: number | null;
  max_per_student: number | null;
}

interface EventCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  image_url?: string | null;
}

export default function AdminSettings() {
  const [resourceCategories, setResourceCategories] = useState<ResourceCategory[]>([]);
  const [eventCategories, setEventCategories] = useState<EventCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog state
  const [dialogType, setDialogType] = useState<"resource" | "event" | null>(null);
  const [editingItem, setEditingItem] = useState<ResourceCategory | EventCategory | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "",
    image_url: "",
    base_wellness_hours: "1",
    hourly_factor: "0.5",
    is_low_risk: true,
    requires_approval: true,
    max_loan_days: "7",
    max_per_student: "1",
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const [{ data: resources }, { data: events }] = await Promise.all([
      supabase.from("resource_categories").select("*").order("name"),
      supabase.from("event_categories").select("*").order("name"),
    ]);

    setResourceCategories(resources || []);
    setEventCategories(events || []);
    setIsLoading(false);
  };

  const handleOpenDialog = (type: "resource" | "event", item?: ResourceCategory | EventCategory) => {
    setDialogType(type);
    if (item) {
      setEditingItem(item);
      const resourceItem = item as ResourceCategory;
      setFormData({
        name: item.name,
        description: item.description || "",
        icon: item.icon || "",
        image_url: item.image_url || "",
        base_wellness_hours: resourceItem.base_wellness_hours?.toString() || "1",
        hourly_factor: resourceItem.hourly_factor?.toString() || "0.5",
        is_low_risk: resourceItem.is_low_risk ?? true,
        requires_approval: resourceItem.requires_approval ?? true,
        max_loan_days: resourceItem.max_loan_days?.toString() || "7",
        max_per_student: resourceItem.max_per_student?.toString() || "1",
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: "",
        description: "",
        icon: "",
        image_url: "",
        base_wellness_hours: "1",
        hourly_factor: "0.5",
        is_low_risk: true,
        requires_approval: true,
        max_loan_days: "7",
        max_per_student: "1",
      });
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !dialogType) {
      toast({ title: "Error", description: "El nombre es requerido", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const table = dialogType === "resource" ? "resource_categories" : "event_categories";

    const categoryData: any = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      icon: formData.icon.trim() || null,
      image_url: formData.image_url || null,
    };

    if (dialogType === "resource") {
      categoryData.base_wellness_hours = parseFloat(formData.base_wellness_hours) || 1;
      categoryData.hourly_factor = parseFloat(formData.hourly_factor) || 0.5;
      categoryData.is_low_risk = formData.is_low_risk;
      categoryData.requires_approval = formData.requires_approval;
      categoryData.max_loan_days = parseInt(formData.max_loan_days) || 7;
      categoryData.max_per_student = parseInt(formData.max_per_student) || 1;
    }

    let error;
    if (editingItem) {
      ({ error } = await supabase.from(table).update(categoryData).eq("id", editingItem.id));
    } else {
      ({ error } = await supabase.from(table).insert(categoryData));
    }

    if (error) {
      console.error("Error saving category:", error);
      toast({ title: "Error", description: "No se pudo guardar la categoría", variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: editingItem ? "Categoría actualizada" : "Categoría creada" });
      setDialogType(null);
      fetchCategories();
    }
    setIsSaving(false);
  };

  const handleDelete = async (type: "resource" | "event", id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta categoría?")) return;

    const table = type === "resource" ? "resource_categories" : "event_categories";
    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error) {
      toast({ title: "Error", description: "No se pudo eliminar la categoría", variant: "destructive" });
    } else {
      toast({ title: "Eliminado", description: "Categoría eliminada correctamente" });
      fetchCategories();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
          <p className="text-muted-foreground">Gestiona las categorías, reglas y ajustes del sistema</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="system" className="space-y-4">
            <TabsList>
              <TabsTrigger value="system">
                <Cog className="mr-2 h-4 w-4" />
                Sistema
              </TabsTrigger>
              <TabsTrigger value="resources">
                <Package className="mr-2 h-4 w-4" />
                Categorías de Recursos
              </TabsTrigger>
              <TabsTrigger value="events">
                <Calendar className="mr-2 h-4 w-4" />
                Categorías de Eventos
              </TabsTrigger>
            </TabsList>

            {/* System Settings Tab */}
            <TabsContent value="system">
              <SystemSettingsPanel />
            </TabsContent>

            {/* Resource Categories Tab */}
            <TabsContent value="resources">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Categorías de Recursos</CardTitle>
                    <CardDescription>
                      Configura las categorías, reglas de aprobación y horas de bienestar
                    </CardDescription>
                  </div>
                  <Button onClick={() => handleOpenDialog("resource")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Categoría
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Horas Base</TableHead>
                        <TableHead>Días Máx.</TableHead>
                        <TableHead>Riesgo</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resourceCategories.map((cat) => (
                        <TableRow key={cat.id}>
                          <TableCell className="font-medium">
                            {cat.icon && <span className="mr-2">{cat.icon}</span>}
                            {cat.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px] truncate">
                            {cat.description || "-"}
                          </TableCell>
                          <TableCell>{cat.base_wellness_hours}h</TableCell>
                          <TableCell>{cat.max_loan_days || 7} días</TableCell>
                          <TableCell>
                            <Badge variant={cat.is_low_risk ? "secondary" : "destructive"}>
                              {cat.is_low_risk ? "Bajo" : "Alto"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenDialog("resource", cat)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDelete("resource", cat.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Event Categories Tab */}
            <TabsContent value="events">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Categorías de Eventos</CardTitle>
                    <CardDescription>
                      Organiza los eventos por tipo o temática
                    </CardDescription>
                  </div>
                  <Button onClick={() => handleOpenDialog("event")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Categoría
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eventCategories.map((cat) => (
                        <TableRow key={cat.id}>
                          <TableCell className="font-medium">
                            {cat.icon && <span className="mr-2">{cat.icon}</span>}
                            {cat.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {cat.description || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenDialog("event", cat)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDelete("event", cat.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Category Dialog */}
        <Dialog open={!!dialogType} onOpenChange={() => setDialogType(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Editar" : "Nueva"} Categoría de {dialogType === "resource" ? "Recursos" : "Eventos"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="🎮 o games"
                />
              </div>
              <ImageUpload
                value={formData.image_url}
                onChange={(url) => setFormData({ ...formData, image_url: url })}
                bucket="category-images"
                label="Imagen de la Categoría"
              />
              {dialogType === "resource" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="base_hours">Horas Base</Label>
                      <Input
                        id="base_hours"
                        type="number"
                        step="0.5"
                        value={formData.base_wellness_hours}
                        onChange={(e) => setFormData({ ...formData, base_wellness_hours: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="factor">Factor por Hora</Label>
                      <Input
                        id="factor"
                        type="number"
                        step="0.1"
                        value={formData.hourly_factor}
                        onChange={(e) => setFormData({ ...formData, hourly_factor: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_days">Días Máx. Préstamo</Label>
                      <Input
                        id="max_days"
                        type="number"
                        min="1"
                        max="30"
                        value={formData.max_loan_days}
                        onChange={(e) => setFormData({ ...formData, max_loan_days: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_per_student">Máx. por Estudiante</Label>
                      <Input
                        id="max_per_student"
                        type="number"
                        min="1"
                        max="10"
                        value={formData.max_per_student}
                        onChange={(e) => setFormData({ ...formData, max_per_student: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Bajo Riesgo</Label>
                        <p className="text-xs text-muted-foreground">
                          Permite auto-aprobación
                        </p>
                      </div>
                      <Switch
                        checked={formData.is_low_risk}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_low_risk: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Requiere Aprobación</Label>
                        <p className="text-xs text-muted-foreground">
                          Un admin debe aprobar
                        </p>
                      </div>
                      <Switch
                        checked={formData.requires_approval}
                        onCheckedChange={(checked) => setFormData({ ...formData, requires_approval: checked })}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogType(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingItem ? "Guardar Cambios" : "Crear Categoría"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
