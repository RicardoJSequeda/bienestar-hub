import { useEffect, useState } from "react";
import { useAuth } from "@/contextos/ContextoAutenticacion";
import { supabase } from "@/servicios/cliente";
import { Card, CardContent } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/componentes/ui/page-header";
import { Clock, Package, Calendar, ArrowRight, Play, Star, ChevronRight } from "lucide-react";
import { HorizontalScroll } from "@/componentes/ui/horizontal-scroll";
import { HeroSkeleton, CardSkeleton } from "@/componentes/ui/skeleton-loaders";
import { EmptyEvents, EmptyLoans } from "@/componentes/ui/empty-states";
import { useRealtimeSubscription } from "@/ganchos/usar-suscripcion-tiempo-real";
import { PWAInstallPrompt } from "@/componentes/pwa/AvisoInstalacionPWA";
import { ResourceDetailDialog } from "@/componentes/recursos/DialogoDetalleRecurso";

interface DashboardData {
  upcomingEvents: any[];
  activeLoans: any[];
  popularResources: any[];
  totalHours: number;
}

const SEMESTER_GOAL = 32;

export function StudentDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [data, setData] = useState<DashboardData>({
    upcomingEvents: [],
    activeLoans: [],
    popularResources: [],
    totalHours: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (!profile?.user_id) return;

    try {
      // Ejecutar todas las queries en paralelo para mejor rendimiento
      const [eventsResult, loansResult, resourcesResult, hoursResult] = await Promise.all([
        // 1. Upcoming Events (Next 30 days)
        supabase
          .from("event_enrollments")
          .select("*, events(*)")
          .eq("user_id", profile.user_id)
          .gte("events.start_date", new Date().toISOString())
          .order("events(start_date)", { ascending: true })
          .limit(5),

        // 2. Active Loans
        supabase
          .from("loans")
          .select("*, resources(*)")
          .eq("user_id", profile.user_id)
          .in("status", ["approved", "active"])
          .limit(10),

        // 3. Popular Resources
        supabase
          .from("resources")
          .select("*, resource_categories(*)")
          .eq("status", "available")
          .limit(6),

        // 4. Hours
        supabase
          .from("wellness_hours")
          .select("hours")
          .eq("user_id", profile.user_id),
      ]);

      const totalHours = hoursResult.data?.reduce((sum, h) => sum + Number(h.hours), 0) || 0;

      setData({
        upcomingEvents: eventsResult.data || [],
        activeLoans: loansResult.data || [],
        popularResources: resourcesResult.data || [],
        totalHours
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.user_id]);

  // Realtime Subscriptions
  useRealtimeSubscription("loans", fetchData, `user_id=eq.${profile?.user_id}`);
  useRealtimeSubscription("event_enrollments", fetchData, `user_id=eq.${profile?.user_id}`);
  useRealtimeSubscription("wellness_hours", fetchData, `user_id=eq.${profile?.user_id}`);
  useRealtimeSubscription("resources", fetchData);


  const featuredEvent = data.upcomingEvents[0]?.events;
  const progressPercent = Math.min((data.totalHours / SEMESTER_GOAL) * 100, 100);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <HeroSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }


  return (
    <div className="space-y-10 animate-fade-in pb-10">
      {/* 1. HERO SECTION: Featured Item or Welcome */}
      <section className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[400px] flex items-end group">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/60 to-transparent z-10" />

        {/* Background Image (Featured Event or Generic) */}
        {featuredEvent?.image_url ? (
          <img
            src={featuredEvent.image_url}
            alt="Featured"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=2070')] bg-cover bg-center" />
        )}

        <div className="relative z-20 p-8 md:p-12 w-full max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 text-xs font-bold uppercase tracking-widest mb-2">
            <Star className="w-3 h-3 fill-white" />
            {featuredEvent ? "Próximo Evento Destacado" : "Bienvenido a Bienestar"}
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight">
            {featuredEvent ? featuredEvent.title : `Hola, ${profile?.full_name?.split(" ")[0]}`}
          </h1>

          <p className="text-lg text-white/90 line-clamp-2 max-w-xl">
            {featuredEvent
              ? featuredEvent.description
              : "Descubre los recursos y eventos que tenemos para ti. Tu desarrollo integral es nuestra prioridad."}
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <Button size="lg" className="rounded-full px-8 py-6 text-lg font-semibold bg-white text-primary hover:bg-white/90 shadow-xl transition-all hover:scale-105" onClick={() => navigate(featuredEvent ? `/events` : `/resources`)}>
              <Play className="w-5 h-5 mr-2 fill-current" />
              {featuredEvent ? "Ver Detalles" : "Explorar Recursos"}
            </Button>
            <Button size="lg" variant="secondary" className="rounded-full px-8 py-6 text-lg bg-white/20 text-white border-0 hover:bg-white/30 backdrop-blur-md shadow-lg" onClick={() => navigate("/my-hours")}>
              <Clock className="w-5 h-5 mr-2" />
              Mis Horas: {data.totalHours.toFixed(1)}h
            </Button>
          </div>
        </div>
      </section>

      {/* 2. PROGRESS RING (Mini visual gamification) */}
      {/* Only show if not complete */}
      {progressPercent < 100 && (
        <div className="px-1">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2 px-1">
            <span className="font-medium">Tu progreso semestral</span>
            <span>{data.totalHours.toFixed(1)} / {SEMESTER_GOAL} horas</span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* 3. CAROUSEL: Active Loans */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-2xl font-bold tracking-tight">Mis Préstamos Activos</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/my-loans")} className="text-primary group">
            Ver todo <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        {data.activeLoans.length > 0 ? (
          <HorizontalScroll>
            {data.activeLoans.map((loan) => (
              <div key={loan.id} className="w-[280px] shrink-0 transform transition-all hover:scale-[1.02] cursor-pointer" onClick={() => navigate("/my-loans")}>
                <div className="aspect-video relative rounded-xl overflow-hidden bg-muted">
                  {loan.resources?.image_url ? (
                    <img src={loan.resources.image_url} className="w-full h-full object-cover" alt={loan.resources.name} />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/5">
                      <Package className="w-10 h-10 text-primary/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                    <h3 className="text-white font-bold truncate">{loan.resources?.name}</h3>
                    <p className="text-white/80 text-xs">Devolver antes del vencimiento</p>
                  </div>
                </div>
              </div>
            ))}
          </HorizontalScroll>
        ) : (
          <EmptyLoans />
        )}
      </section>

      {/* 4. CAROUSEL: Popular/New Resources */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-2xl font-bold tracking-tight">Recursos Recomendados</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/resources")} className="text-primary group">
            Explorar catálogo <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        <HorizontalScroll>
          {data.popularResources.map((resource) => (
            <div key={resource.id} className="w-[220px] shrink-0 transform transition-all hover:scale-[1.02] group cursor-pointer" onClick={() => setSelectedResource(resource)}>
              <div className="aspect-[3/4] relative rounded-xl overflow-hidden bg-muted mb-3 shadow-md">
                {resource.image_url ? (
                  <img src={resource.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={resource.name} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-accent/5">
                    <Package className="w-12 h-12 text-accent/20" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span className="bg-white/90 backdrop-blur text-xs font-bold px-2 py-1 rounded-md shadow-sm">
                    {resource.resource_categories?.base_wellness_hours}h
                  </span>
                </div>
              </div>
              <h3 className="font-semibold text-sm truncate px-1 group-hover:text-primary transition-colors">{resource.name}</h3>
              <p className="text-xs text-muted-foreground px-1">{resource.resource_categories?.name}</p>
            </div>
          ))}
        </HorizontalScroll>
      </section>

      {/* 5. CAROUSEL: Upcoming Events */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-2xl font-bold tracking-tight">Tu Agenda</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/events")} className="text-primary group">
            Ver calendario <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        {data.upcomingEvents.length > 0 ? (
          <HorizontalScroll>
            {data.upcomingEvents.map((enrollment) => (
              <div key={enrollment.id} className="w-[300px] shrink-0 relative overflow-hidden rounded-2xl bg-card border shadow-sm hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/events")}>
                <div className="h-32 bg-primary/10 relative">
                  {enrollment.events?.image_url ? (
                    <img src={enrollment.events.image_url} className="w-full h-full object-cover" alt={enrollment.events.title} />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Calendar className="w-10 h-10 text-primary/20" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold truncate text-lg">{enrollment.events?.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{enrollment.events?.description}</p>
                  <div className="mt-4 flex items-center text-xs font-medium text-primary bg-primary/5 w-fit px-3 py-1.5 rounded-full">
                    <Clock className="w-3 h-3 mr-1.5" />
                    {new Date(enrollment.events?.start_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </HorizontalScroll>
        ) : (
          <EmptyEvents />
        )}
      </section>
      <PWAInstallPrompt />

      <ResourceDetailDialog
        resource={selectedResource}
        isOpen={!!selectedResource}
        onClose={() => setSelectedResource(null)}
        userActiveLoansCount={data.activeLoans.length}
        onLoanSuccess={fetchData}
      />
    </div>
  );
}