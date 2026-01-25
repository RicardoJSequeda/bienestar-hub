import { useEffect, useState } from "react";
import { supabase } from "@/servicios/cliente";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/componentes/ui/badge";
import { StatCard } from "@/componentes/ui/stat-card";
import { PageHeader } from "@/componentes/ui/page-header";
import { EmptyState } from "@/componentes/ui/empty-state";
import { AlertsPanel } from "@/componentes/alertas/PanelAlertas";
import { useProactiveAlerts } from "@/ganchos/usar-alertas-proactivas";
import {
  Package,
  ClipboardList,
  Calendar,
  Users,
  Clock,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle,
  XCircle,
  Sparkles,
  Bell,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  const { runAllChecks } = useProactiveAlerts();
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
      // Run proactive alerts check
      runAllChecks();
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

  return (
    <div className="space-y-8 page-enter">
      {/* Header */}
      <PageHeader
        title="Panel de Administración"
        description="Gestiona recursos, préstamos y eventos de bienestar"
      >
        <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 px-4 py-2 border border-primary/20">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold">
            {stats.totalHoursAwarded.toFixed(1)} horas otorgadas
          </span>
        </div>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Recursos"
          value={`${stats.availableResources}/${stats.totalResources}`}
          description="Disponibles / Total"
          icon={Package}
          variant="primary"
          onClick={() => navigate("/admin/resources")}
          isLoading={isLoading}
        />
        <StatCard
          title="Préstamos Pendientes"
          value={stats.pendingLoans.toString()}
          description={`${stats.activeLoans} activos`}
          icon={ClipboardList}
          variant={stats.pendingLoans > 0 ? "warning" : "success"}
          onClick={() => navigate("/admin/loans")}
          isLoading={isLoading}
          badge={stats.pendingLoans > 0 ? (
            <Badge className="bg-warning text-warning-foreground animate-pulse-soft">
              Pendientes
            </Badge>
          ) : undefined}
        />
        <StatCard
          title="Eventos Próximos"
          value={stats.upcomingEvents.toString()}
          description="Eventos activos"
          icon={Calendar}
          variant="accent"
          onClick={() => navigate("/admin/events")}
          isLoading={isLoading}
        />
        <StatCard
          title="Estudiantes"
          value={stats.totalStudents.toString()}
          description="Registrados"
          icon={Users}
          variant="info"
          onClick={() => navigate("/admin/users")}
          isLoading={isLoading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Loans */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-warning/5 to-transparent">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-warning" />
                Solicitudes Pendientes
              </CardTitle>
              <CardDescription>Préstamos que requieren aprobación</CardDescription>
            </div>
            {stats.pendingLoans > 0 && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                {stats.pendingLoans} pendiente{stats.pendingLoans > 1 ? "s" : ""}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            {pendingLoans.length === 0 ? (
              <EmptyState
                icon={CheckCircle}
                title="Sin solicitudes pendientes"
                description="Todas las solicitudes han sido procesadas"
              />
            ) : (
              <div className="space-y-3">
                {pendingLoans.map((loan, index) => (
                  <div
                    key={loan.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                        <Package className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{loan.resources?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {loan.profiles?.full_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(loan.requested_at), "d MMM", { locale: es })}
                      </p>
                    </div>
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

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Acciones Rápidas
            </CardTitle>
            <CardDescription>Gestión del sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-14 justify-between hover-lift"
              onClick={() => navigate("/admin/resources")}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Gestionar recursos</p>
                  <p className="text-xs text-muted-foreground">Agregar, editar, eliminar</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 justify-between hover-lift"
              onClick={() => navigate("/admin/events")}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20">
                  <Calendar className="h-4 w-4 text-accent-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Crear nuevo evento</p>
                  <p className="text-xs text-muted-foreground">Programar actividades</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 justify-between hover-lift"
              onClick={() => navigate("/admin/reports")}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Ver reportes</p>
                  <p className="text-xs text-muted-foreground">Estadísticas y exportar</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 justify-between hover-lift"
              onClick={() => navigate("/admin/users")}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10">
                  <Users className="h-4 w-4 text-info" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Gestionar usuarios</p>
                  <p className="text-xs text-muted-foreground">Roles y permisos</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Alerts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AlertsPanel />
        
        {/* System Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumen del Sistema</CardTitle>
            <CardDescription>Estado general de la plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-success/5 border border-success/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.availableResources}</p>
                  <p className="text-sm text-muted-foreground">Recursos disponibles</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-warning/5 border border-warning/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeLoans}</p>
                  <p className="text-sm text-muted-foreground">Préstamos activos</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.upcomingEvents}</p>
                  <p className="text-sm text-muted-foreground">Eventos próximos</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-accent/10 border border-accent/30">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20">
                  <Sparkles className="h-6 w-6 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalHoursAwarded.toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">Horas otorgadas</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}