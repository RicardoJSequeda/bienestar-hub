import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, Users, Loader2, CheckCircle } from "lucide-react";
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
  event_categories: {
    id: string;
    name: string;
    icon: string | null;
  } | null;
  enrollment_count: number;
  is_enrolled: boolean;
}

export default function StudentEvents() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);

  useEffect(() => {
    if (profile?.user_id) {
      fetchEvents();
    }
  }, [profile?.user_id]);

  const fetchEvents = async () => {
    // Fetch events
    const { data: eventsData, error } = await supabase
      .from("events")
      .select(`
        *,
        event_categories (id, name, icon)
      `)
      .eq("is_active", true)
      .gte("end_date", new Date().toISOString())
      .order("start_date");

    if (error) {
      console.error("Error fetching events:", error);
      return;
    }

    // Fetch enrollment counts
    const { data: enrollmentCounts } = await supabase
      .from("event_enrollments")
      .select("event_id");

    // Fetch user's enrollments
    const { data: userEnrollments } = await supabase
      .from("event_enrollments")
      .select("event_id")
      .eq("user_id", profile!.user_id);

    const enrolledEventIds = userEnrollments?.map((e) => e.event_id) || [];
    setMyEnrollments(enrolledEventIds);

    // Count enrollments per event
    const countMap: Record<string, number> = {};
    enrollmentCounts?.forEach((e) => {
      countMap[e.event_id] = (countMap[e.event_id] || 0) + 1;
    });

    const eventsWithCounts = eventsData?.map((event) => ({
      ...event,
      enrollment_count: countMap[event.id] || 0,
      is_enrolled: enrolledEventIds.includes(event.id),
    })) as Event[];

    setEvents(eventsWithCounts || []);
    setIsLoading(false);
  };

  const handleEnroll = async () => {
    if (!selectedEvent || !profile?.user_id) return;

    setIsEnrolling(true);

    const { error } = await supabase
      .from("event_enrollments")
      .insert({
        user_id: profile.user_id,
        event_id: selectedEvent.id,
      });

    if (error) {
      console.error("Error enrolling:", error);
      toast({
        title: "Error",
        description: "No se pudo inscribir al evento. Intenta de nuevo.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "¡Inscripción exitosa!",
        description: `Te has inscrito a "${selectedEvent.title}"`,
      });
      setMyEnrollments([...myEnrollments, selectedEvent.id]);
      setEvents(events.map((e) => 
        e.id === selectedEvent.id 
          ? { ...e, is_enrolled: true, enrollment_count: e.enrollment_count + 1 }
          : e
      ));
    }
    setSelectedEvent(null);
    setIsEnrolling(false);
  };

  const handleUnenroll = async (eventId: string) => {
    const { error } = await supabase
      .from("event_enrollments")
      .delete()
      .eq("user_id", profile!.user_id)
      .eq("event_id", eventId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo cancelar la inscripción",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Inscripción cancelada",
        description: "Has cancelado tu inscripción al evento",
      });
      setMyEnrollments(myEnrollments.filter((id) => id !== eventId));
      setEvents(events.map((e) => 
        e.id === eventId 
          ? { ...e, is_enrolled: false, enrollment_count: e.enrollment_count - 1 }
          : e
      ));
    }
  };

  const formatEventDate = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${format(startDate, "d 'de' MMMM, HH:mm", { locale: es })} - ${format(endDate, "HH:mm", { locale: es })}`;
  };

  const availableEvents = events.filter((e) => !e.is_enrolled);
  const enrolledEvents = events.filter((e) => e.is_enrolled);

  const EventCard = ({ event, showEnrollButton = true }: { event: Event; showEnrollButton?: boolean }) => {
    const isFull = event.max_participants ? event.enrollment_count >= event.max_participants : false;

    return (
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        {event.image_url && (
          <div className="aspect-video bg-muted">
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg">{event.title}</CardTitle>
            <Badge variant="secondary" className="shrink-0">
              <Clock className="w-3 h-3 mr-1" />
              {event.wellness_hours}h
            </Badge>
          </div>
          {event.event_categories && (
            <Badge variant="outline" className="w-fit">
              {event.event_categories.name}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <CardDescription className="line-clamp-2">
            {event.description || "Sin descripción"}
          </CardDescription>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formatEventDate(event.start_date, event.end_date)}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>
                {event.enrollment_count}
                {event.max_participants ? ` / ${event.max_participants}` : ""} inscritos
              </span>
            </div>
          </div>
          {showEnrollButton ? (
            event.is_enrolled ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleUnenroll(event.id)}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Inscrito - Cancelar
              </Button>
            ) : (
              <Button
                className="w-full"
                disabled={isFull}
                onClick={() => setSelectedEvent(event)}
              >
                {isFull ? "Cupo Lleno" : "Inscribirse"}
              </Button>
            )
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleUnenroll(event.id)}
            >
              Cancelar Inscripción
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Eventos de Bienestar</h1>
          <p className="text-muted-foreground">
            Descubre y participa en eventos que otorgan horas de bienestar
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="available" className="space-y-4">
            <TabsList>
              <TabsTrigger value="available">
                Disponibles ({availableEvents.length})
              </TabsTrigger>
              <TabsTrigger value="enrolled">
                Mis Inscripciones ({enrolledEvents.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="available">
              {availableEvents.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No hay eventos disponibles</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {availableEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="enrolled">
              {enrolledEvents.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No estás inscrito en ningún evento</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {enrolledEvents.map((event) => (
                    <EventCard key={event.id} event={event} showEnrollButton={false} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Enrollment Dialog */}
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Inscribirse al Evento</DialogTitle>
              <DialogDescription>
                ¿Deseas inscribirte a "{selectedEvent?.title}"?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              {selectedEvent && (
                <>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm font-medium">Horas de bienestar:</p>
                    <p className="text-2xl font-bold text-primary">
                      {selectedEvent.wellness_hours} horas
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Fecha:</strong> {formatEventDate(selectedEvent.start_date, selectedEvent.end_date)}</p>
                    {selectedEvent.location && (
                      <p><strong>Lugar:</strong> {selectedEvent.location}</p>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Las horas se otorgarán cuando un administrador registre tu asistencia.
                  </p>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                Cancelar
              </Button>
              <Button onClick={handleEnroll} disabled={isEnrolling}>
                {isEnrolling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Inscribiendo...
                  </>
                ) : (
                  "Confirmar Inscripción"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
