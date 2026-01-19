import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Package, Calendar, TrendingUp, Loader2, Award, Star } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

export default function MyHours() {
  const { profile } = useAuth();
  const [hours, setHours] = useState<WellnessHour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalHours, setTotalHours] = useState(0);
  const [hoursByMonth, setHoursByMonth] = useState<HoursByMonth[]>([]);

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

  const progressPercentage = Math.min((totalHours / SEMESTER_GOAL) * 100, 100);
  const hoursFromLoans = hours.filter((h) => h.source_type === "loan").reduce((s, h) => s + Number(h.hours), 0);
  const hoursFromEvents = hours.filter((h) => h.source_type === "event").reduce((s, h) => s + Number(h.hours), 0);

  const getSourceIcon = (type: string) => {
    return type === "loan" ? Package : Calendar;
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header - Hidden on mobile */}
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold text-foreground">Mis Horas de Bienestar</h1>
          <p className="text-muted-foreground">
            Revisa tu progreso y el historial de horas acumuladas
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Progress Card - Hero */}
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
              <CardContent className="p-5 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    <span className="text-sm font-medium opacity-90">Progreso del Semestre</span>
                  </div>
                  {totalHours >= SEMESTER_GOAL && (
                    <Badge className="bg-white/20 text-white border-0">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Meta cumplida
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-4xl md:text-5xl font-bold">
                        {totalHours.toFixed(1)}
                      </p>
                      <p className="text-sm opacity-80">de {SEMESTER_GOAL} horas</p>
                    </div>
                    <p className="text-2xl font-semibold">
                      {progressPercentage.toFixed(0)}%
                    </p>
                  </div>
                  
                  <div className="relative h-3 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-white rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  
                  {totalHours < SEMESTER_GOAL && (
                    <p className="text-sm opacity-80">
                      Te faltan <span className="font-semibold">{(SEMESTER_GOAL - totalHours).toFixed(1)} horas</span> para cumplir tu meta
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="card-touch">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-2.5">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{hoursFromLoans.toFixed(1)}h</p>
                    <p className="text-xs text-muted-foreground">Por préstamos</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="card-touch">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="rounded-xl bg-accent/10 p-2.5">
                    <Calendar className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{hoursFromEvents.toFixed(1)}h</p>
                    <p className="text-xs text-muted-foreground">Por eventos</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Hours by Month */}
            {hoursByMonth.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Horas por Mes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {hoursByMonth.slice(0, 4).map((item) => (
                      <div key={item.month} className="flex items-center gap-3">
                        <span className="text-sm capitalize flex-1 truncate">{item.month}</span>
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.min((item.hours / 10) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {item.hours.toFixed(1)}h
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* History */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Historial de Horas</CardTitle>
                <CardDescription>Registro de horas otorgadas</CardDescription>
              </CardHeader>
              <CardContent>
                {hours.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="rounded-full bg-muted p-4 mb-4">
                      <Clock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">Aún no tienes horas registradas</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {hours.slice(0, 10).map((hour) => {
                      const Icon = getSourceIcon(hour.source_type);
                      return (
                        <div
                          key={hour.id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 card-touch"
                        >
                          <div className={cn(
                            "rounded-lg p-2",
                            hour.source_type === "loan" ? "bg-primary/10" : "bg-accent/10"
                          )}>
                            <Icon className={cn(
                              "h-4 w-4",
                              hour.source_type === "loan" ? "text-primary" : "text-accent"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {hour.description || (hour.source_type === "loan" ? "Préstamo" : "Evento")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(hour.awarded_at), "d MMM yyyy", { locale: es })}
                            </p>
                          </div>
                          <Badge variant="secondary" className="shrink-0 bg-success/10 text-success border-0">
                            +{Number(hour.hours).toFixed(1)}h
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
