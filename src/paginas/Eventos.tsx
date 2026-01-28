import { useEffect, useState } from "react";
import { supabase } from "@/servicios/cliente";
import { useAuth } from "@/contextos/ContextoAutenticacion";
import { DashboardLayout } from "@/componentes/diseno/DisenoTablero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";
import { Switch } from "@/componentes/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/componentes/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { Checkbox } from "@/componentes/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/componentes/ui/dropdown-menu";
import { toast } from "@/ganchos/usar-toast";
import { Plus, Search, MoreVertical, Pencil, Trash2, Calendar, Users, Loader2, Eye, XCircle, RotateCcw, Clock3 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ImageUpload } from "@/componentes/ui/ImageUpload";
import { validarEvento } from "@/utilidades/validaciones";

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

  // Waitlist dialog
  const [waitlistEvent, setWaitlistEvent] = useState<Event | null>(null);
  const [waitlist, setWaitlist] = useState<Array<{ id: string; position: number; status: string; user_id: string; profiles: { full_name: string; email: string } }>>([]);
  const [isLoadingWaitlist, setIsLoadingWaitlist] = useState(false);
  const [waitlistToRemove, setWaitlistToRemove] = useState<string | null>(null);
  const [eventToAction, setEventToAction] = useState<Event | null>(null);

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
    try {
      // Optimizacion: Obtener conteo directamente desde la BD en lugar de traer todos los registros
      const { data: eventsData, error } = await supabase
        .from("events")
        .select(`
          *,
          event_categories (id, name),
          event_enrollments (count)
        `)
        .order("start_date", { ascending: false });

      if (error) {
        console.error("Error fetching events:", error);
        toast({ title: "Error", description: "No se pudieron cargar los eventos", variant: "destructive" });
        return;
      }

      // Transformar datos para manejar el count que viene como objeto
      const eventsWithCounts = eventsData?.map((event: any) => ({
        ...event,
        enrollment_count: event.event_enrollments?.[0]?.count || 0,
      }));

      setEvents(eventsWithCounts as Event[]);
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setIsLoading(false);
    }
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
        profiles!event_enrollments_user_id_fkey (full_name, email, student_code)
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
    const validationError = validarEvento({
      titulo: formData.title,
      inicio: formData.start_date,
      fin: formData.end_date,
      cupoMaximo: formData.max_participants,
      horasBienestar: formData.wellness_hours,
    });

    if (validationError) {
      toast({ title: "Error", description: validationError, variant: "destructive" });
      return;
    }

    setIsSaving(true);

    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    const maxParticipants = formData.max_participants ? parseInt(formData.max_participants) : null;
    const wellnessHours = parseFloat(formData.wellness_hours);

    const eventData = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      image_url: formData.image_url.trim() || null,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      location: formData.location.trim() || null,
      max_participants: maxParticipants,
      wellness_hours: wellnessHours,
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

  const handleDelete = (id: string) => {
    const event = events.find(e => e.id === id);
    if (!event) return;
    setEventToAction(event);
  };

  const confirmEventAction = async () => {
    if (!eventToAction) return;
    const id = eventToAction.id;

    if (eventToAction.is_active) {
      // Cancelar evento (desactivar y notificar)
      const { error: updateError } = await supabase
        .from("events")
        .update({ is_active: false })
        .eq("id", id);

      if (updateError) {
        toast({ title: "Error", description: "No se pudo cancelar el evento", variant: "destructive" });
        return;
      }

      // Obtener todos los inscritos
      const { data: enrollments } = await supabase
        .from("event_enrollments")
        .select("user_id")
        .eq("event_id", id);

      if (enrollments && enrollments.length > 0) {
        // Notificar a todos los inscritos
        await supabase.from("notifications").insert(
          enrollments.map(enrollment => ({
            user_id: enrollment.user_id,
            type: "event_cancelled",
            title: "Evento cancelado",
            message: `El evento "${eventToAction.title}" ha sido cancelado.`,
            link: "/events",
            data: { event_id: id },
          })) as any
        );
      }

      toast({
        title: "Evento cancelado",
        description: `Se notificó a ${enrollments?.length || 0} estudiante(s) inscrito(s)`
      });
    } else {
      // Eliminar permanentemente (solo si ya está cancelado)
      const { error: deleteError } = await supabase.from("events").delete().eq("id", id);
      if (deleteError) {
        toast({ title: "Error", description: "No se pudo eliminar el evento", variant: "destructive" });
        return;
      }
      toast({ title: "Eliminado", description: "Evento eliminado permanentemente" });
    }

    setEventToAction(null);
    fetchEvents();
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

  const openWaitlistDialog = async (event: Event) => {
    setWaitlistEvent(event);
    setIsLoadingWaitlist(true);

    const { data, error } = await supabase
      .from("event_waitlist")
      .select(`
        *,
        profiles!event_waitlist_user_id_fkey (full_name, email)
      `)
      .eq("event_id", event.id)
      .order("position", { ascending: true });

    if (error) {
      console.error("Error fetching waitlist:", error);
      toast({ title: "Error", description: "No se pudo cargar la lista de espera", variant: "destructive" });
    } else {
      setWaitlist(data as any || []);
    }

    setIsLoadingWaitlist(false);
  };

  const handleNotifyWaitlist = async (waitlistId: string) => {
    const { error } = await supabase
      .from("event_waitlist")
      .update({
        status: "notified",
        notified_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } as any)
      .eq("id", waitlistId);

    if (error) {
      toast({ title: "Error", description: "No se pudo notificar", variant: "destructive" });
    } else {
      // Crear notificación
      const waitlistItem = waitlist.find(w => w.id === waitlistId);
      if (waitlistItem) {
        await supabase.from("notifications").insert({
          user_id: waitlistItem.user_id,
          type: "waitlist_spot_available",
          title: "Cupo disponible en evento",
          message: `Hay un cupo disponible para el evento "${waitlistEvent?.title}". Tienes 24 horas para inscribirte.`,
          link: "/events",
          data: { event_id: waitlistEvent?.id, waitlist_id: waitlistId },
        } as any);
      }

      toast({ title: "Notificado", description: "Se ha notificado al estudiante" });
      openWaitlistDialog(waitlistEvent!);
    }
  };

  const handleRemoveFromWaitlist = (waitlistId: string) => {
    const item = waitlist.find(w => w.id === waitlistId);
    if (item) setWaitlistToRemove(waitlistId);
  };

  const confirmWaitlistRemoval = async () => {
    if (!waitlistToRemove) return;

    const { error } = await supabase
      .from("event_waitlist")
      .delete()
      .eq("id", waitlistToRemove);

    if (error) {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    } else {
      toast({ title: "Eliminado", description: "Posición eliminada de la lista" });
      openWaitlistDialog(waitlistEvent!);
    }
    setWaitlistToRemove(null);
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
                      <Badge variant={event.is_active ? "default" : "destructive"}>
                        {event.is_active ? "Activo" : "Cancelado"}
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
                          {event.max_participants && event.enrollment_count && event.enrollment_count >= event.max_participants && (
                            <DropdownMenuItem onClick={() => openWaitlistDialog(event)}>
                              <Clock3 className="mr-2 h-4 w-4" />
                              Ver Lista de Espera
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleOpenDialog(event)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          {event.is_active ? (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(event.id)}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancelar Evento
                            </DropdownMenuItem>
                          ) : (
                            <>
                              <DropdownMenuItem
                                onClick={async () => {
                                  const { error } = await supabase
                                    .from("events")
                                    .update({ is_active: true })
                                    .eq("id", event.id);
                                  if (error) {
                                    toast({ title: "Error", description: "No se pudo reactivar el evento", variant: "destructive" });
                                  } else {
                                    toast({ title: "Evento reactivado", description: "El evento está nuevamente activo" });
                                    fetchEvents();
                                  }
                                }}
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Reactivar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(event.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar Permanentemente
                              </DropdownMenuItem>
                            </>
                          )}
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
              <ImageUpload
                value={formData.image_url}
                onChange={(url) => setFormData({ ...formData, image_url: url })}
                bucket="event-images"
                label="Imagen del Evento"
              />
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

        {/* Waitlist Dialog */}
        <Dialog open={!!waitlistEvent} onOpenChange={() => setWaitlistEvent(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Lista de Espera</DialogTitle>
              <DialogDescription>{waitlistEvent?.title}</DialogDescription>
            </DialogHeader>
            {isLoadingWaitlist ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : waitlist.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay estudiantes en lista de espera
              </p>
            ) : (
              <div className="space-y-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Posición</TableHead>
                      <TableHead>Estudiante</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waitlist.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-bold">#{item.position}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.profiles?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{item.profiles?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            item.status === "notified" ? "default" :
                              item.status === "enrolled" ? "secondary" :
                                item.status === "expired" ? "destructive" : "outline"
                          }>
                            {item.status === "waiting" ? "Esperando" :
                              item.status === "notified" ? "Notificado" :
                                item.status === "enrolled" ? "Inscrito" :
                                  item.status === "expired" ? "Expirado" : item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {item.status === "waiting" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleNotifyWaitlist(item.id)}
                              >
                                Notificar
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveFromWaitlist(item.id)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setWaitlistEvent(null)}>
                Cerrar
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

        {/* Event Action Dialog */}
        <AlertDialog open={!!eventToAction} onOpenChange={() => setEventToAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {eventToAction?.is_active ? "¿Cancelar evento?" : "¿Eliminar evento permanentemente?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {eventToAction?.is_active
                  ? "Se notificará a todos los estudiantes inscritos. Esta acción no elimina los registros históricos."
                  : "Esta acción no se puede deshacer. Se perderá toda la información relacionada con este evento."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmEventAction}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {eventToAction?.is_active ? "Cancelar Evento" : "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Waitlist Removal Dialog */}
        <AlertDialog open={!!waitlistToRemove} onOpenChange={() => setWaitlistToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar de lista de espera?</AlertDialogTitle>
              <AlertDialogDescription>
                El estudiante perderá su posición y deberá inscribirse nuevamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmWaitlistRemoval}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
