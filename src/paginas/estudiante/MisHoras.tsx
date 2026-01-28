import { useEffect, useState } from "react";
import { supabase } from "@/servicios/cliente";
import { useAuth } from "@/contextos/ContextoAutenticacion";
import { DashboardLayout } from "@/componentes/diseno/DisenoTablero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Badge } from "@/componentes/ui/badge";
import { ProgressRing } from "@/componentes/ui/progress-ring";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/componentes/ui/collapsible";
import { startOfDay, endOfDay } from "date-fns";
import { Clock, Package, Calendar, TrendingUp, Filter, ChevronDown, ChevronUp, Star, Medal, Trophy } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/utilidades/utilidades";
import { HeroSkeleton, CardSkeleton } from "@/componentes/ui/skeleton-loaders";
import { useRealtimeSubscription } from "@/ganchos/usar-suscripcion-tiempo-real";
import { CertificateGenerator } from "@/componentes/horas/GeneradorCertificado";

interface WellnessHour {
  id: string;
  hours: number;
  source_type: "loan" | "event";
  source_id: string;
  description: string | null;
  awarded_at: string;
}

interface HoursByMonth {
  month: string;
  hours: number;
}

const SEMESTER_GOAL = 32;

// Gamification Levels
const LEVELS = [
  { name: "Iniciado", min: 0, icon: Star, color: "text-slate-400" },
  { name: "Bronce", min: 10, icon: Medal, color: "text-orange-400" },
  { name: "Plata", min: 20, icon: Medal, color: "text-gray-300" },
  { name: "Oro", min: 32, icon: Trophy, color: "text-yellow-400" },
];

export default function MyHours() {
  const { profile } = useAuth();
  const [hours, setHours] = useState<WellnessHour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalHours, setTotalHours] = useState(0);
  const [hoursByMonth, setHoursByMonth] = useState<HoursByMonth[]>([]);

  // Filtros avanzados
  const [showFilters, setShowFilters] = useState(false);
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "hours" | "source">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (profile?.user_id) {
      fetchHours();
    }
  }, [profile?.user_id]);


  const fetchHours = async () => {
    const { data, error } = await supabase
      .from("wellness_hours")
      .select("*")
      .eq("user_id", profile!.user_id)
      .order("awarded_at", { ascending: false });

    if (error) {
      console.error("Error fetching hours:", error);
    } else {
      setHours(data as WellnessHour[]);
      const total = data.reduce((sum, h) => sum + Number(h.hours), 0);
      setTotalHours(total);

      const monthMap: Record<string, number> = {};
      data.forEach((h) => {
        const month = format(new Date(h.awarded_at), "MMMM yyyy", { locale: es });
        monthMap[month] = (monthMap[month] || 0) + Number(h.hours);
      });
      setHoursByMonth(
        Object.entries(monthMap).map(([month, hrs]) => ({ month, hours: hrs }))
      );
    }
    setIsLoading(false);
  };

  // Realtime Subscription
  useRealtimeSubscription("wellness_hours", fetchHours, `user_id=eq.${profile?.user_id}`);

  const progressPercentage = Math.min((totalHours / SEMESTER_GOAL) * 100, 100);

  // Función de filtrado avanzado
  const applyFilters = (hoursList: WellnessHour[]) => {
    let filtered = [...hoursList];

    // Filtro por tipo de fuente
    if (filterSource !== "all") {
      filtered = filtered.filter(h => h.source_type === filterSource);
    }

    // Filtro por fecha (rango)
    if (filterDateFrom) {
      const fromDate = startOfDay(new Date(filterDateFrom));
      filtered = filtered.filter(h => {
        const hourDate = new Date(h.awarded_at);
        return hourDate >= fromDate;
      });
    }

    if (filterDateTo) {
      const toDate = endOfDay(new Date(filterDateTo));
      filtered = filtered.filter(h => {
        const hourDate = new Date(h.awarded_at);
        return hourDate <= toDate;
      });
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "date":
          comparison = new Date(a.awarded_at).getTime() - new Date(b.awarded_at).getTime();
          break;
        case "hours":
          comparison = Number(a.hours) - Number(b.hours);
          break;
        case "source":
          comparison = (a.source_type || "").localeCompare(b.source_type || "");
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  };

  const displayedHours = applyFilters(hours);
  const hoursFromLoans = hours.filter((h) => h.source_type === "loan").reduce((s, h) => s + Number(h.hours), 0);
  const hoursFromEvents = hours.filter((h) => h.source_type === "event").reduce((s, h) => s + Number(h.hours), 0);

  const getSourceIcon = (type: string) => type === "loan" ? Package : Calendar;

  const currentLevel = LEVELS.slice().reverse().find(l => totalHours >= l.min) || LEVELS[0];
  const nextLevel = LEVELS.find(l => l.min > totalHours);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <HeroSkeleton />
          <div className="grid grid-cols-2 gap-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mis Horas</h1>
            <p className="text-muted-foreground">
              Monitorea tu progreso y alcanza la meta del semestre
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full border">
              <currentLevel.icon className={cn("w-5 h-5", currentLevel.color)} />
              <span className="font-semibold text-sm">Nivel {currentLevel.name}</span>
            </div>
            <CertificateGenerator
              totalHours={totalHours}
              hoursFromLoans={hoursFromLoans}
              hoursFromEvents={hoursFromEvents}
              currentLevel={currentLevel.name}
              semesterGoal={SEMESTER_GOAL}
            />
          </div>
        </div>

        {/* Hero Progress Card */}
        <Card className="overflow-hidden border-0 shadow-lg relative bg-gradient-to-br from-primary via-primary/90 to-accent text-white">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat" />

          <CardContent className="p-8 relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1 space-y-4 text-center md:text-left">
                <div>
                  <h2 className="text-2xl font-bold opacity-90">Progreso Semestral</h2>
                  <div className="flex items-baseline justify-center md:justify-start gap-1">
                    <span className="text-5xl font-black">{totalHours.toFixed(1)}</span>
                    <span className="text-xl opacity-70">/ {SEMESTER_GOAL} horas</span>
                  </div>
                </div>

                {nextLevel ? (
                  <p className="text-sm bg-white/10 rounded-lg p-2 inline-block backdrop-blur-sm border border-white/10">
                    🚀 Faltan <strong>{(nextLevel.min - totalHours).toFixed(1)}h</strong> para nivel {nextLevel.name}
                  </p>
                ) : (
                  <p className="text-sm bg-white/20 rounded-lg p-2 inline-block backdrop-blur-sm font-bold text-yellow-300">
                    🏆 ¡Has alcanzado el nivel máximo!
                  </p>
                )}
              </div>

              <div className="bg-white/10 p-4 rounded-full backdrop-blur-sm shadow-inner border border-white/20">
                <ProgressRing
                  progress={progressPercentage}
                  size={140}
                  strokeWidth={12}
                  className="text-white drop-shadow-lg"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-blue-50/50 dark:bg-blue-900/10">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="rounded-2xl bg-blue-100 dark:bg-blue-900 p-3 text-blue-600 dark:text-blue-300">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Por Préstamos</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{hoursFromLoans.toFixed(1)}h</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-purple-50/50 dark:bg-purple-900/10">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="rounded-2xl bg-purple-100 dark:bg-purple-900 p-3 text-purple-600 dark:text-purple-300">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Por Eventos</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{hoursFromEvents.toFixed(1)}h</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md md:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Tendencia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {hoursByMonth.slice(0, 3).map((item) => (
                  <div key={item.month} className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase flex-1 truncate text-muted-foreground">{item.month}</span>
                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min((item.hours / 10) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold w-10 text-right">
                      {item.hours.toFixed(0)}h
                    </span>
                  </div>
                ))}
                {hoursByMonth.length === 0 && <p className="text-xs text-muted-foreground">Sin actividad reciente</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Filters */}
        <Collapsible
          open={showFilters}
          onOpenChange={setShowFilters}
          className="w-full space-y-2"
        >
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Filter className="w-4 h-4" /> Búsqueda y Filtros
            </h3>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <Card className="border-none shadow-md overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Fuente */}
                  <div className="space-y-2">
                    <Label htmlFor="source" className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Fuente</Label>
                    <Select value={filterSource} onValueChange={setFilterSource}>
                      <SelectTrigger id="source" className="bg-muted/30 border-none">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="loan">Préstamos</SelectItem>
                        <SelectItem value="event">Eventos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fecha Desde */}
                  <div className="space-y-2">
                    <Label htmlFor="dateFrom" className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Desde</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      className="bg-muted/30 border-none"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                    />
                  </div>

                  {/* Fecha Hasta */}
                  <div className="space-y-2">
                    <Label htmlFor="dateTo" className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Hasta</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      className="bg-muted/30 border-none"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                    />
                  </div>

                  {/* Ordenar Por */}
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Ordenar por</Label>
                    <div className="flex gap-2">
                      <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                        <SelectTrigger className="bg-muted/30 border-none flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">Fecha</SelectItem>
                          <SelectItem value="hours">Horas</SelectItem>
                          <SelectItem value="source">Fuente</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="shrink-0"
                        onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                      >
                        {sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Botón Limpiar Filtros */}
                {(filterSource !== "all" || filterDateFrom || filterDateTo || sortBy !== "date" || sortOrder !== "desc") && (
                  <div className="mt-6 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => {
                        setFilterSource("all");
                        setFilterDateFrom("");
                        setFilterDateTo("");
                        setSortBy("date");
                        setSortOrder("desc");
                      }}
                    >
                      Limpiar Filtros
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* History List */}
        <Card className="border-none shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Historial Detallado</CardTitle>
                <CardDescription>Registro completo de tus actividades aprobadas</CardDescription>
              </div>
              {displayedHours.length !== hours.length && (
                <Badge variant="secondary" className="font-mono">
                  {displayedHours.length} de {hours.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {displayedHours.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Clock className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold">Aún no tienes horas</h3>
                <p className="text-muted-foreground">Participa en eventos o solicita recursos para comenzar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedHours.map((hour, i) => {
                  const Icon = getSourceIcon(hour.source_type);
                  return (
                    <div
                      key={hour.id}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-all border border-transparent hover:border-border group"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <div className={cn(
                        "rounded-xl p-3 shrink-0 transition-transform group-hover:scale-110",
                        hour.source_type === "loan" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">
                          {hour.description || (hour.source_type === "loan" ? "Préstamo de Recurso" : "Asistencia a Evento")}
                        </h4>
                        <p className="text-xs text-muted-foreground capitalize">
                          {format(new Date(hour.awarded_at), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="outline" className="text-sm px-3 py-1 bg-green-50 text-green-700 border-green-200">
                          +{Number(hour.hours).toFixed(1)}h
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
