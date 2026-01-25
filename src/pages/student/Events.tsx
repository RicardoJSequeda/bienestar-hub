import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, Users, Loader2, CheckCircle, Search, Play, Ticket, ChevronRight, Share2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { HeroSkeleton, CardSkeleton } from "@/components/ui/skeleton-loaders";
import { EmptyEvents } from "@/components/ui/empty-states";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

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

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

export default function StudentEvents() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<Category[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (profile?.user_id) {
      fetchData();
    }
  }, [profile?.user_id]);

  const fetchData = async () => {
    try {
      // Fetch categories
      const { data: categoriesData } = await supabase
        .from("event_categories")
        .select("*");
      if (categoriesData) setCategories(categoriesData);

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

      if (error) throw error;

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
    } catch (err) {
      console.error("Unexpected error in fetchData:", err);
      toast({ title: "Error", description: "No se pudieron cargar los eventos", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useRealtimeSubscription("events", fetchData);
  useRealtimeSubscription("event_enrollments", fetchData);

  const handleEnroll = async (event: Event) => {
    if (!profile?.user_id) return;
    setIsProcessing(true);

    const { error } = await supabase
      .from("event_enrollments")
      .insert({
        user_id: profile.user_id,
        event_id: event.id,
      });

    if (error) {
      toast({ title: "Error", description: "No se pudo inscribir al evento.", variant: "destructive" });
    } else {
      toast({ title: "¡Inscripción exitosa!", description: `Te has inscrito a "${event.title}"` });
      fetchData();
    }
    setIsProcessing(false);
  };

  const handleUnenroll = async (event: Event) => {
    if (!profile?.user_id) return;
    setIsProcessing(true);

    const { error } = await supabase
      .from("event_enrollments")
      .delete()
      .eq("user_id", profile.user_id)
      .eq("event_id", event.id);

    if (error) {
      toast({ title: "Error", description: "No se pudo cancelar la inscripción", variant: "destructive" });
    } else {
      toast({ title: "Inscripción cancelada", description: "Has liberado tu cupo." });
      fetchData();
    }
    setIsProcessing(false);
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || event.event_categories?.id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredEvent = events.find(e => !e.is_enrolled) || events[0];
  const myAgenda = events.filter(e => e.is_enrolled);

  const formatEventDate = (start: string) => {
    return format(new Date(start), "d 'de' MMMM", { locale: es });
  };

  const formatEventTime = (start: string, end: string) => {
    return `${format(new Date(start), "HH:mm")} - ${format(new Date(end), "HH:mm")}`;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <HeroSkeleton />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CardSkeleton /> <CardSkeleton /> <CardSkeleton />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in pb-10">

        {/* Header & Search */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agenda de Bienestar</h1>
            <p className="text-muted-foreground">Inscríbete y participa para sumar horas de bienestar</p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar eventos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 rounded-full bg-background border shadow-sm focus-visible:ring-primary"
            />
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            className="rounded-full px-6"
            onClick={() => setSelectedCategory('all')}
          >
            Todos
          </Button>
          {categories.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              className="rounded-full px-6 whitespace-nowrap"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </Button>
          ))}
        </div>

        {/* Featured Event Hero (Only if not searching) */}
        {!searchTerm && selectedCategory === 'all' && featuredEvent && (
          <div className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[450px] flex items-end group">
            {featuredEvent.image_url ? (
              <img src={featuredEvent.image_url} alt={featuredEvent.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
            ) : (
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544367563-12123d832d34?q=80&w=2070')] bg-cover bg-center" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

            <div className="relative z-10 p-8 md:p-12 w-full max-w-4xl">
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-primary hover:bg-primary text-white border-0 px-3 py-1 text-sm">{featuredEvent.event_categories?.name || "Evento"}</Badge>
                <Badge variant="outline" className="text-white border-white/30 backdrop-blur-md bg-white/10">
                  <Clock className="w-3 h-3 mr-1" /> {featuredEvent.wellness_hours} Horas
                </Badge>
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">{featuredEvent.title}</h1>
              <p className="text-lg text-white/80 line-clamp-2 max-w-2xl mb-8">{featuredEvent.description}</p>

              <div className="flex flex-wrap gap-4">
                {featuredEvent.is_enrolled ? (
                  <Button size="lg" className="rounded-full bg-green-500 hover:bg-green-600 text-white border-0 px-8" onClick={() => navigate(`/events/${featuredEvent.id}`)}>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Ya estás inscrito
                  </Button>
                ) : (
                  <Button size="lg" className="rounded-full px-8 py-6 text-lg font-bold" onClick={() => handleEnroll(featuredEvent)} disabled={isProcessing}>
                    <Ticket className="w-5 h-5 mr-2" />
                    Inscribirse Ahora
                  </Button>
                )}
                <Button size="lg" variant="outline" className="rounded-full px-8 py-6 text-lg text-white border-white/30 hover:bg-white/10 backdrop-blur-md" onClick={() => navigate(`/events/${featuredEvent.id}`)}>
                  Ver Detalles
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* My Agenda Section */}
        {myAgenda.length > 0 && selectedCategory === 'all' && !searchTerm && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">Mi Agenda</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {myAgenda.map(event => (
                <div key={event.id} className="group relative bg-card rounded-2xl p-4 border shadow-sm hover:shadow-md transition-all flex gap-4 items-center cursor-pointer" onClick={() => navigate(`/events/${event.id}`)}>
                  <div className="h-20 w-20 rounded-xl bg-muted overflow-hidden shrink-0">
                    {event.image_url ? (
                      <img src={event.image_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary"><Calendar className="w-8 h-8" /></div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-primary uppercase mb-0.5">{formatEventDate(event.start_date)}</p>
                    <h3 className="font-bold truncate">{event.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatEventTime(event.start_date, event.end_date)}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <Button size="icon" variant="ghost" className="rounded-full"><ChevronRight className="w-5 h-5 text-muted-foreground" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Available Events Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">
              {searchTerm ? "Resultados de búsqueda" : "Próximos Eventos"}
            </h2>
            <span className="text-sm text-muted-foreground font-medium bg-muted/50 px-3 py-1 rounded-full">
              {filteredEvents.length} eventos
            </span>
          </div>

          {filteredEvents.length === 0 ? (
            <EmptyEvents />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredEvents.map((event) => {
                const isFull = event.max_participants ? (event.enrollment_count >= event.max_participants) : false;
                return (
                  <div key={event.id} className="group bg-card rounded-3xl overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full cursor-pointer" onClick={() => navigate(`/events/${event.id}`)}>
                    {/* Image */}
                    <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                      {event.image_url ? (
                        <img src={event.image_url} alt={event.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-accent/5"><Calendar className="w-12 h-12 text-accent/20" /></div>
                      )}
                      <div className="absolute top-3 right-3 flex gap-2">
                        <Badge className="bg-white/90 backdrop-blur text-black border-0 font-bold shadow-sm">{formatEventDate(event.start_date)}</Badge>
                      </div>
                      {event.is_enrolled && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                          <div className="bg-green-500 text-white px-4 py-2 rounded-full font-bold flex items-center shadow-lg transform scale-110">
                            <CheckCircle className="w-5 h-5 mr-2" /> Inscrito
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-5 flex flex-col flex-1">
                      <div className="mb-2">
                        <span className="text-xs font-bold text-primary tracking-wider uppercase">{event.event_categories?.name || "General"}</span>
                        <h3 className="font-bold text-lg leading-tight mt-1 line-clamp-2 group-hover:text-primary transition-colors">{event.title}</h3>
                      </div>

                      <div className="space-y-2 mt-auto">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="w-4 h-4 mr-2" />
                          {formatEventTime(event.start_date, event.end_date)}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 mr-2" />
                          <span className="truncate">{event.location || "Ubicación por definir"}</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Users className="w-4 h-4 mr-2" />
                          <span>{event.enrollment_count} {event.max_participants && `/ ${event.max_participants}`} inscritos</span>
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-border/50 flex gap-2">
                        {event.is_enrolled ? (
                          <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); handleUnenroll(event); }}>
                            Cancelar
                          </Button>
                        ) : (
                          <Button className="w-full rounded-xl font-bold" disabled={isFull || isProcessing} onClick={(e) => { e.stopPropagation(); handleEnroll(event); }}>
                            {isFull ? "Cupo Lleno" : "Inscribirse"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
