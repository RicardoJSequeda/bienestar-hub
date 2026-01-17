import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { Plus, MoreVertical, Pencil, Trash2, Settings, Package, Calendar, Loader2 } from "lucide-react";

interface ResourceCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  base_wellness_hours: number;
  hourly_factor: number;
}

interface EventCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
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
    base_wellness_hours: "1",
    hourly_factor: "0.5",
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
      setFormData({
        name: item.name,
        description: item.description || "",
        icon: item.icon || "",
        base_wellness_hours: (item as ResourceCategory).base_wellness_hours?.toString() || "1",
        hourly_factor: (item as ResourceCategory).hourly_factor?.toString() || "0.5",
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: "",
        description: "",
        icon: "",
        base_wellness_hours: "1",
        hourly_factor: "0.5",
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
    };

    if (dialogType === "resource") {
      categoryData.base_wellness_hours = parseFloat(formData.base_wellness_hours) || 1;
      categoryData.hourly_factor = parseFloat(formData.hourly_factor) || 0.5;
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
          <p className="text-muted-foreground">Gestiona las categorías y ajustes del sistema</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="resources" className="space-y-4">
            <TabsList>
              <TabsTrigger value="resources">
                <Package className="mr-2 h-4 w-4" />
                Categorías de Recursos
              </TabsTrigger>
              <TabsTrigger value="events">
                <Calendar className="mr-2 h-4 w-4" />
                Categorías de Eventos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="resources">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Categorías de Recursos</CardTitle>
                    <CardDescription>
                      Configura las categorías y las horas de bienestar asociadas
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
                        <TableHead>Factor/Hora</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resourceCategories.map((cat) => (
                        <TableRow key={cat.id}>
                          <TableCell className="font-medium">{cat.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {cat.description || "-"}
                          </TableCell>
                          <TableCell>{cat.base_wellness_hours}h</TableCell>
                          <TableCell>{cat.hourly_factor}</TableCell>
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
                          <TableCell className="font-medium">{cat.name}</TableCell>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Editar" : "Nueva"} Categoría de {dialogType === "resource" ? "Recursos" : "Eventos"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
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
                <Label htmlFor="icon">Icono (emoji o texto)</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="🎮 o games"
                />
              </div>
              {dialogType === "resource" && (
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
                    <p className="text-xs text-muted-foreground">
                      Horas mínimas otorgadas por préstamo
                    </p>
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
                    <p className="text-xs text-muted-foreground">
                      Bonificación por hora de uso
                    </p>
                  </div>
                </div>
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
