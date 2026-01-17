import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, MoreVertical, Pencil, Trash2, Calendar, Users, Loader2, Eye } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Event {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  start_date: string;
  end_date: string;
  location: string | null;
  max_participants: number | null;
  wellness_hours: number;
  is_active: boolean;
  category_id: string | null;
  event_categories: { id: string; name: string } | null;
  enrollment_count?: number;
}

interface Enrollment {
  id: string;
  user_id: string;
  attended: boolean;
  profiles: { full_name: string; email: string; student_code: string | null };
}

interface Category {
  id: string;
  name: string;
}

export default function AdminEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Attendance dialog
  const [attendanceEvent, setAttendanceEvent] = useState<Event | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoadingEnrollments, setIsLoadingEnrollments] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
    start_date: "",
    end_date: "",
    location: "",
    max_participants: "",
    wellness_hours: "1",
    is_active: true,
    category_id: "",
  });

  useEffect(() => {
    fetchEvents();
    fetchCategories();
  }, []);

  const fetchEvents = async () => {
    const { data: eventsData, error } = await supabase
      .from("events")
      .select(`*, event_categories (id, name)`)
      .order("start_date", { ascending: false });

    if (error) {
      console.error("Error fetching events:", error);
      return;
    }

    // Fetch enrollment counts
    const { data: enrollmentCounts } = await supabase
      .from("event_enrollments")
      .select("event_id");

    const countMap: Record<string, number> = {};
    enrollmentCounts?.forEach((e) => {
      countMap[e.event_id] = (countMap[e.event_id] || 0) + 1;
    });

    const eventsWithCounts = eventsData?.map((event) => ({
      ...event,
      enrollment_count: countMap[event.id] || 0,
    }));

    setEvents(eventsWithCounts as Event[]);
    setIsLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("event_categories").select("id, name").order("name");
    if (data) setCategories(data);
  };

  const fetchEnrollments = async (eventId: string) => {
    setIsLoadingEnrollments(true);
    const { data, error } = await supabase
      .from("event_enrollments")
      .select(`
        id,
        user_id,
        attended,
        profiles:user_id (full_name, email, student_code)
      `)
      .eq("event_id", eventId);

    if (error) {
      console.error("Error fetching enrollments:", error);
    } else {
      setEnrollments(data as unknown as Enrollment[]);
    }
    setIsLoadingEnrollments(false);
  };

  const handleOpenDialog = (event?: Event) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        description: event.description || "",
        image_url: event.image_url || "",
        start_date: event.start_date.slice(0, 16),
        end_date: event.end_date.slice(0, 16),
        location: event.location || "",
        max_participants: event.max_participants?.toString() || "",
        wellness_hours: event.wellness_hours.toString(),
        is_active: event.is_active,
        category_id: event.category_id || "",
      });
    } else {
      setEditingEvent(null);
      const now = new Date();
      const later = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      setFormData({
        title: "",
        description: "",
        image_url: "",
        start_date: format(now, "yyyy-MM-dd'T'HH:mm"),
        end_date: format(later, "yyyy-MM-dd'T'HH:mm"),
        location: "",
        max_participants: "",
        wellness_hours: "1",
        is_active: true,
        category_id: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.start_date || !formData.end_date) {
      toast({ title: "Error", description: "Completa los campos requeridos", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    const eventData = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      image_url: formData.image_url.trim() || null,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: new Date(formData.end_date).toISOString(),
      location: formData.location.trim() || null,
      max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
      wellness_hours: parseFloat(formData.wellness_hours) || 1,
      is_active: formData.is_active,
      category_id: formData.category_id || null,
      created_by: user?.id,
    };

    let error;
    if (editingEvent) {
      ({ error } = await supabase.from("events").update(eventData).eq("id", editingEvent.id));
    } else {
      ({ error } = await supabase.from("events").insert(eventData));
    }

    if (error) {
      console.error("Error saving event:", error);
      toast({ title: "Error", description: "No se pudo guardar el evento", variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: editingEvent ? "Evento actualizado" : "Evento creado" });
      setIsDialogOpen(false);
      fetchEvents();
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este evento?")) return;

    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "No se pudo eliminar el evento", variant: "destructive" });
    } else {
      toast({ title: "Eliminado", description: "Evento eliminado correctamente" });
      fetchEvents();
    }
  };

  const handleAttendance = async (enrollment: Enrollment, attended: boolean) => {
    if (!attendanceEvent || !user) return;

    const updateData: any = { attended };
    if (attended) {
      updateData.attendance_registered_at = new Date().toISOString();
      updateData.attendance_registered_by = user.id;
    }

    const { error } = await supabase
      .from("event_enrollments")
      .update(updateData)
      .eq("id", enrollment.id);

    if (error) {
      toast({ title: "Error", description: "No se pudo actualizar la asistencia", variant: "destructive" });
      return;
    }

    // Award hours if marking as attended
    if (attended) {
      await supabase.from("wellness_hours").insert({
        user_id: enrollment.user_id,
        hours: attendanceEvent.wellness_hours,
        source_type: "event",
        source_id: attendanceEvent.id,
        description: `Evento: ${attendanceEvent.title}`,
        awarded_by: user.id,
      });
    } else {
      // Remove hours if unmarking
      await supabase
        .from("wellness_hours")
        .delete()
        .eq("source_type", "event")
        .eq("source_id", attendanceEvent.id)
        .eq("user_id", enrollment.user_id);
    }

    setEnrollments(enrollments.map((e) =>
      e.id === enrollment.id ? { ...e, attended } : e
    ));
    toast({ title: "Actualizado", description: attended ? "Asistencia registrada" : "Asistencia removida" });
  };

  const openAttendanceDialog = (event: Event) => {
    setAttendanceEvent(event);
    fetchEnrollments(event.id);
  };

  const filteredEvents = events.filter((e) =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestión de Eventos</h1>
            <p className="text-muted-foreground">Crea y administra eventos de bienestar</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Evento
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar eventos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay eventos registrados</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Inscritos</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{event.title}</p>
                        {event.event_categories && (
                          <Badge variant="outline" className="mt-1">
                            {event.event_categories.name}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(event.start_date), "d MMM yyyy, HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {event.enrollment_count}
                        {event.max_participants && `/${event.max_participants}`}
                      </div>
                    </TableCell>
                    <TableCell>{event.wellness_hours}h</TableCell>
                    <TableCell>
                      <Badge variant={event.is_active ? "default" : "secondary"}>
                        {event.is_active ? "Activo" : "Inactivo"}
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
                          <DropdownMenuItem onClick={() => openAttendanceDialog(event)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Inscritos
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenDialog(event)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(event.id)}
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
          </Card>
        )}

        {/* Event Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEvent ? "Editar Evento" : "Nuevo Evento"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Inicio *</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Fin *</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Ubicación</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_participants">Cupo máximo</Label>
                  <Input
                    id="max_participants"
                    type="number"
                    value={formData.max_participants}
                    onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                    placeholder="Sin límite"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wellness_hours">Horas de bienestar</Label>
                  <Input
                    id="wellness_hours"
                    type="number"
                    step="0.5"
                    value={formData.wellness_hours}
                    onChange={(e) => setFormData({ ...formData, wellness_hours: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image_url">URL de Imagen</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Evento activo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingEvent ? "Guardar Cambios" : "Crear Evento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Attendance Dialog */}
        <Dialog open={!!attendanceEvent} onOpenChange={() => setAttendanceEvent(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registro de Asistencia</DialogTitle>
              <DialogDescription>{attendanceEvent?.title}</DialogDescription>
            </DialogHeader>
            {isLoadingEnrollments ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : enrollments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay estudiantes inscritos
              </p>
            ) : (
              <div className="space-y-2">
                {enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={enrollment.attended}
                        onCheckedChange={(checked) => handleAttendance(enrollment, !!checked)}
                      />
                      <div>
                        <p className="font-medium text-sm">{enrollment.profiles?.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {enrollment.profiles?.student_code || enrollment.profiles?.email}
                        </p>
                      </div>
                    </div>
                    {enrollment.attended && (
                      <Badge className="bg-success text-success-foreground">Asistió</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAttendanceEvent(null)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
