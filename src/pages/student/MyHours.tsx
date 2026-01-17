import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Package, Calendar, TrendingUp, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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

const SEMESTER_GOAL = 32; // Meta de horas por semestre

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

      // Group by month
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

  const getSourceIcon = (type: string) => {
    return type === "loan" ? Package : Calendar;
  };

  const getSourceLabel = (type: string) => {
    return type === "loan" ? "Préstamo" : "Evento";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
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
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Progreso del Semestre
                  </CardTitle>
                  <CardDescription>
                    Meta: {SEMESTER_GOAL} horas de bienestar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-4xl font-bold text-primary">
                        {totalHours.toFixed(1)}
                      </p>
                      <p className="text-sm text-muted-foreground">horas acumuladas</p>
                    </div>
                    <p className="text-lg font-medium">
                      {progressPercentage.toFixed(0)}%
                    </p>
                  </div>
                  <Progress value={progressPercentage} className="h-3" />
                  {totalHours >= SEMESTER_GOAL ? (
                    <p className="text-sm text-success font-medium">
                      🎉 ¡Felicidades! Has cumplido tu meta del semestre
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Te faltan {(SEMESTER_GOAL - totalHours).toFixed(1)} horas para cumplir tu meta
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Por préstamos</span>
                    </div>
                    <span className="font-medium">
                      {hours.filter((h) => h.source_type === "loan").reduce((s, h) => s + Number(h.hours), 0).toFixed(1)}h
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Por eventos</span>
                    </div>
                    <span className="font-medium">
                      {hours.filter((h) => h.source_type === "event").reduce((s, h) => s + Number(h.hours), 0).toFixed(1)}h
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium">Total</span>
                    <span className="font-bold text-primary">{totalHours.toFixed(1)}h</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Hours by Month */}
            {hoursByMonth.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Horas por Mes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {hoursByMonth.map((item) => (
                      <div key={item.month} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{item.month}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${Math.min((item.hours / 10) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {item.hours.toFixed(1)}h
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Historial de Horas</CardTitle>
                <CardDescription>Registro detallado de todas las horas otorgadas</CardDescription>
              </CardHeader>
              <CardContent>
                {hours.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aún no tienes horas registradas</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {hours.map((hour) => {
                      const Icon = getSourceIcon(hour.source_type);
                      return (
                        <div
                          key={hour.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-primary/10 p-2">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {hour.description || getSourceLabel(hour.source_type)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(hour.awarded_at), "d 'de' MMMM, yyyy", { locale: es })}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-primary">
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
