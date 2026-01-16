import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  ClipboardList,
  Calendar,
  Users,
  Clock,
  AlertCircle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

interface AdminStats {
  totalResources: number;
  availableResources: number;
  pendingLoans: number;
  activeLoans: number;
  upcomingEvents: number;
  totalStudents: number;
  totalHoursAwarded: number;
}

interface PendingLoan {
  id: string;
  requested_at: string;
  profiles: { full_name: string };
  resources: { name: string };
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats>({
    totalResources: 0,
    availableResources: 0,
    pendingLoans: 0,
    activeLoans: 0,
    upcomingEvents: 0,
    totalStudents: 0,
    totalHoursAwarded: 0,
  });
  const [pendingLoans, setPendingLoans] = useState<PendingLoan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch resource counts
        const { count: totalResources } = await supabase
          .from("resources")
          .select("*", { count: "exact", head: true });

        const { count: availableResources } = await supabase
          .from("resources")
          .select("*", { count: "exact", head: true })
          .eq("status", "available");

        // Fetch loan counts
        const { count: pendingLoansCount } = await supabase
          .from("loans")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");

        const { count: activeLoansCount } = await supabase
          .from("loans")
          .select("*", { count: "exact", head: true })
          .in("status", ["approved", "active"]);

        // Fetch pending loans details
        const { data: pendingLoansData } = await supabase
          .from("loans")
          .select(`
            id,
            requested_at,
            profiles:user_id(full_name),
            resources:resource_id(name)
          `)
          .eq("status", "pending")
          .order("requested_at", { ascending: true })
          .limit(5);

        // Fetch upcoming events
        const { count: upcomingEventsCount } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .gte("start_date", new Date().toISOString())
          .eq("is_active", true);

        // Fetch total students
        const { count: totalStudents } = await supabase
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "student");

        // Fetch total hours awarded
        const { data: hoursData } = await supabase
          .from("wellness_hours")
          .select("hours");

        const totalHoursAwarded = hoursData?.reduce((sum, h) => sum + Number(h.hours), 0) || 0;

        setStats({
          totalResources: totalResources || 0,
          availableResources: availableResources || 0,
          pendingLoans: pendingLoansCount || 0,
          activeLoans: activeLoansCount || 0,
          upcomingEvents: upcomingEventsCount || 0,
          totalStudents: totalStudents || 0,
          totalHoursAwarded,
        });

        setPendingLoans(pendingLoansData as unknown as PendingLoan[] || []);
      } catch (error) {
        console.error("Error fetching admin stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Recursos",
      value: `${stats.availableResources}/${stats.totalResources}`,
      description: "Disponibles / Total",
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
      action: () => navigate("/admin/resources"),
    },
    {
      title: "Préstamos Pendientes",
      value: stats.pendingLoans.toString(),
      description: `${stats.activeLoans} activos`,
      icon: ClipboardList,
      color: stats.pendingLoans > 0 ? "text-warning" : "text-success",
      bgColor: stats.pendingLoans > 0 ? "bg-warning/10" : "bg-success/10",
      action: () => navigate("/admin/loans"),
      badge: stats.pendingLoans > 0,
    },
    {
      title: "Eventos Próximos",
      value: stats.upcomingEvents.toString(),
      description: "Eventos activos",
      icon: Calendar,
      color: "text-accent",
      bgColor: "bg-accent/10",
      action: () => navigate("/admin/events"),
    },
    {
      title: "Estudiantes",
      value: stats.totalStudents.toString(),
      description: "Registrados",
      icon: Users,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      action: () => navigate("/admin/users"),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Panel de Administración</h1>
          <p className="text-muted-foreground">
            Gestiona recursos, préstamos y eventos de bienestar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {stats.totalHoursAwarded.toFixed(1)} horas otorgadas
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card
            key={stat.title}
            className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 relative"
            onClick={stat.action}
          >
            {stat.badge && (
              <Badge className="absolute -top-2 -right-2 bg-warning text-warning-foreground">
                Nuevo
              </Badge>
            )}
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

      {/* Pending Loans & Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Solicitudes Pendientes</CardTitle>
              <CardDescription>Préstamos que requieren aprobación</CardDescription>
            </div>
            {stats.pendingLoans > 0 && (
              <AlertCircle className="h-5 w-5 text-warning" />
            )}
          </CardHeader>
          <CardContent>
            {pendingLoans.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay solicitudes pendientes
              </p>
            ) : (
              <div className="space-y-3">
                {pendingLoans.map((loan) => (
                  <div
                    key={loan.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{loan.resources?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {loan.profiles?.full_name}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(loan.requested_at).toLocaleDateString("es")}
                    </p>
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => navigate("/admin/loans")}
                >
                  Ver todos los préstamos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
            <CardDescription>Gestión del sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate("/admin/resources")}
            >
              Gestionar recursos
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate("/admin/events")}
            >
              Crear nuevo evento
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate("/admin/reports")}
            >
              Ver reportes
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate("/admin/users")}
            >
              Gestionar usuarios
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
