import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Clock, Package, Calendar, ClipboardList, ArrowRight, Target, TrendingUp, Award } from "lucide-react";

interface DashboardStats {
  totalHours: number;
  activeLoans: number;
  upcomingEvents: number;
  pendingLoans: number;
}

interface RecentActivity {
  id: string;
  type: "loan" | "event" | "hours";
  title: string;
  description: string;
  date: string;
}

const SEMESTER_GOAL = 40; // Goal hours per semester

export function StudentDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalHours: 0,
    activeLoans: 0,
    upcomingEvents: 0,
    pendingLoans: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile?.user_id) return;

      try {
        // Fetch wellness hours
        const { data: hoursData } = await supabase
          .from("wellness_hours")
          .select("hours")
          .eq("user_id", profile.user_id);

        const totalHours = hoursData?.reduce((sum, h) => sum + Number(h.hours), 0) || 0;

        // Fetch active loans
        const { count: activeLoansCount } = await supabase
          .from("loans")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profile.user_id)
          .in("status", ["approved", "active"]);

        // Fetch pending loans
        const { count: pendingLoansCount } = await supabase
          .from("loans")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profile.user_id)
          .eq("status", "pending");

        // Fetch upcoming events user is enrolled in
        const { count: upcomingEventsCount } = await supabase
          .from("event_enrollments")
          .select("*, events!inner(start_date)", { count: "exact", head: true })
          .eq("user_id", profile.user_id)
          .gte("events.start_date", new Date().toISOString());

        setStats({
          totalHours,
          activeLoans: activeLoansCount || 0,
          pendingLoans: pendingLoansCount || 0,
          upcomingEvents: upcomingEventsCount || 0,
        });

        // Simulated recent activity
        setRecentActivity([
          { id: "1", type: "hours", title: "Horas de Bienestar", description: "Evento: Taller de Yoga", date: "Hace 2 días" },
          { id: "2", type: "loan", title: "Préstamo devuelto", description: "Libro: Atomic Habits", date: "Hace 3 días" },
          { id: "3", type: "event", title: "Inscripción a evento", description: "Torneo de Fútbol", date: "Hace 5 días" },
        ]);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [profile?.user_id]);

  const progressPercentage = Math.min((stats.totalHours / SEMESTER_GOAL) * 100, 100);

  return (
    <div className="space-y-8 page-enter">
      {/* Welcome Header */}
      <PageHeader
        title={`¡Hola, ${profile?.full_name?.split(" ")[0] || "Estudiante"}!`}
        description="Bienvenido al sistema de Bienestar Universitario"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Horas de Bienestar"
          value={stats.totalHours.toFixed(1)}
          description={`Meta: ${SEMESTER_GOAL}h`}
          icon={Clock}
          variant="primary"
          onClick={() => navigate("/my-hours")}
          isLoading={isLoading}
        />
        <StatCard
          title="Préstamos Activos"
          value={stats.activeLoans.toString()}
          description={stats.pendingLoans > 0 ? `${stats.pendingLoans} pendiente(s)` : "Sin pendientes"}
          icon={ClipboardList}
          variant="success"
          onClick={() => navigate("/my-loans")}
          isLoading={isLoading}
        />
        <StatCard
          title="Próximos Eventos"
          value={stats.upcomingEvents.toString()}
          description="Eventos inscritos"
          icon={Calendar}
          variant="accent"
          onClick={() => navigate("/events")}
          isLoading={isLoading}
        />
        <StatCard
          title="Recursos"
          value="Ver"
          description="Explorar catálogo"
          icon={Package}
          variant="warning"
          onClick={() => navigate("/resources")}
          isLoading={isLoading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Progress Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Meta del Semestre</CardTitle>
            </div>
            <CardDescription>Progreso hacia tu objetivo</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-4">
            <ProgressRing 
              progress={progressPercentage} 
              size={160}
              strokeWidth={12}
            />
            <div className="mt-4 text-center">
              <p className="text-2xl font-bold">{stats.totalHours.toFixed(1)} / {SEMESTER_GOAL}h</p>
              <p className="text-sm text-muted-foreground">
                {stats.totalHours >= SEMESTER_GOAL 
                  ? "¡Meta alcanzada! 🎉" 
                  : `Faltan ${(SEMESTER_GOAL - stats.totalHours).toFixed(1)} horas`
                }
              </p>
            </div>
            <div className="w-full mt-6 p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Préstamos</span>
                <span className="font-medium">{stats.activeLoans * 2}h estimadas</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Eventos</span>
                <span className="font-medium">{stats.upcomingEvents * 2}h potenciales</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions & Profile */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
              </div>
              <CardDescription>Accede a las funciones más utilizadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant="outline"
                  className="h-auto py-4 justify-start hover-lift"
                  onClick={() => navigate("/resources")}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Solicitar recurso</p>
                      <p className="text-xs text-muted-foreground">Explorar catálogo</p>
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 justify-start hover-lift"
                  onClick={() => navigate("/events")}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
                      <Calendar className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Ver eventos</p>
                      <p className="text-xs text-muted-foreground">Próximas actividades</p>
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 justify-start hover-lift"
                  onClick={() => navigate("/my-loans")}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                      <ClipboardList className="h-5 w-5 text-success" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Mis préstamos</p>
                      <p className="text-xs text-muted-foreground">Estado actual</p>
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 justify-start hover-lift"
                  onClick={() => navigate("/my-hours")}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                      <Award className="h-5 w-5 text-info" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Mis horas</p>
                      <p className="text-xs text-muted-foreground">Historial completo</p>
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mi Perfil</CardTitle>
              <CardDescription>Información de tu cuenta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-medium">{profile?.full_name || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{profile?.email || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Código Estudiantil</p>
                  <p className="font-medium">{profile?.student_code || "No registrado"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Carrera</p>
                  <p className="font-medium">{profile?.major || "No registrada"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}