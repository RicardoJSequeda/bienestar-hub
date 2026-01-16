import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Clock, Package, Calendar, ClipboardList, ArrowRight } from "lucide-react";

interface DashboardStats {
  totalHours: number;
  activeLoans: number;
  upcomingEvents: number;
  pendingLoans: number;
}

export function StudentDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalHours: 0,
    activeLoans: 0,
    upcomingEvents: 0,
    pendingLoans: 0,
  });
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
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [profile?.user_id]);

  const statCards = [
    {
      title: "Horas de Bienestar",
      value: stats.totalHours.toFixed(1),
      description: "Horas acumuladas",
      icon: Clock,
      color: "text-primary",
      bgColor: "bg-primary/10",
      action: () => navigate("/my-hours"),
    },
    {
      title: "Préstamos Activos",
      value: stats.activeLoans.toString(),
      description: stats.pendingLoans > 0 ? `${stats.pendingLoans} pendiente(s)` : "Sin pendientes",
      icon: ClipboardList,
      color: "text-success",
      bgColor: "bg-success/10",
      action: () => navigate("/my-loans"),
    },
    {
      title: "Próximos Eventos",
      value: stats.upcomingEvents.toString(),
      description: "Eventos inscritos",
      icon: Calendar,
      color: "text-accent",
      bgColor: "bg-accent/10",
      action: () => navigate("/events"),
    },
    {
      title: "Recursos",
      value: "Ver",
      description: "Explorar catálogo",
      icon: Package,
      color: "text-warning",
      bgColor: "bg-warning/10",
      action: () => navigate("/resources"),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          ¡Hola, {profile?.full_name?.split(" ")[0] || "Estudiante"}!
        </h1>
        <p className="text-muted-foreground">
          Bienvenido al sistema de Bienestar Universitario
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card
            key={stat.title}
            className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-1"
            onClick={stat.action}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
            <CardDescription>Accede a las funciones más utilizadas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate("/resources")}
            >
              Solicitar un recurso
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate("/events")}
            >
              Ver eventos disponibles
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate("/my-hours")}
            >
              Consultar mis horas
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mi Perfil</CardTitle>
            <CardDescription>Información de tu cuenta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Nombre</p>
              <p className="font-medium">{profile?.full_name || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{profile?.email || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Código Estudiantil</p>
              <p className="font-medium">{profile?.student_code || "No registrado"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Carrera</p>
              <p className="font-medium">{profile?.major || "No registrada"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
