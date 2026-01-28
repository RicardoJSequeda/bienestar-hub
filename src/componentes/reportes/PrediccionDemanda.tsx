import { useEffect, useState } from "react";
import { supabase } from "@/servicios/cliente";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Badge } from "@/componentes/ui/badge";
import { Progress } from "@/componentes/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  BarChart3,
  Loader2,
  AlertTriangle,
  Package,
  Sparkles
} from "lucide-react";
import { format, subDays, startOfDay, getDay, getHours } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/componentes/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface DemandPattern {
  resourceId: string;
  resourceName: string;
  categoryName: string;
  totalLoans: number;
  avgLoansPerDay: number;
  peakDay: string;
  peakHour: number;
  trend: "up" | "down" | "stable";
  predictedDemand: "high" | "medium" | "low";
}

interface TimePattern {
  hour: number;
  loans: number;
  label: string;
}

interface DayPattern {
  day: string;
  loans: number;
  dayNumber: number;
}

const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const chartConfig = {
  loans: {
    label: "Préstamos",
    color: "hsl(var(--primary))",
  },
  high: {
    label: "Alta",
    color: "hsl(var(--destructive))",
  },
  medium: {
    label: "Media",
    color: "hsl(var(--warning))",
  },
  low: {
    label: "Baja",
    color: "hsl(var(--success))",
  },
};

export function DemandPrediction() {
  const [isLoading, setIsLoading] = useState(true);
  const [demandPatterns, setDemandPatterns] = useState<DemandPattern[]>([]);
  const [hourlyPattern, setHourlyPattern] = useState<TimePattern[]>([]);
  const [dailyPattern, setDailyPattern] = useState<DayPattern[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<{ name: string; value: number; color: string }[]>([]);

  useEffect(() => {
    analyzeDemand();
  }, []);

  const analyzeDemand = async () => {
    setIsLoading(true);
    const thirtyDaysAgo = subDays(new Date(), 30);

    // Fetch loans with resource and category data
    const { data: loans } = await supabase
      .from("loans")
      .select(`
        id,
        requested_at,
        resource_id,
        resources!demand_stats_resource_id_fkey(name, category_id, resource_categories!resources_category_id_fkey(name))
      `)
      .gte("requested_at", thirtyDaysAgo.toISOString());

    if (!loans || loans.length === 0) {
      setIsLoading(false);
      return;
    }

    // Analyze by resource
    const resourceMap: Record<string, {
      name: string;
      category: string;
      loans: Date[];
      hourCounts: number[];
      dayCounts: number[];
    }> = {};

    const globalHourCounts = new Array(24).fill(0);
    const globalDayCounts = new Array(7).fill(0);
    const categoryCounts: Record<string, number> = {};

    for (const loan of loans) {
      const resourceId = loan.resource_id;
      const date = new Date(loan.requested_at);
      const hour = getHours(date);
      const day = getDay(date);

      if (!resourceMap[resourceId]) {
        resourceMap[resourceId] = {
          name: (loan.resources as any)?.name || "Desconocido",
          category: (loan.resources as any)?.resource_categories?.name || "Sin categoría",
          loans: [],
          hourCounts: new Array(24).fill(0),
          dayCounts: new Array(7).fill(0),
        };
      }

      resourceMap[resourceId].loans.push(date);
      resourceMap[resourceId].hourCounts[hour]++;
      resourceMap[resourceId].dayCounts[day]++;

      globalHourCounts[hour]++;
      globalDayCounts[day]++;

      const categoryName = (loan.resources as any)?.resource_categories?.name || "Sin categoría";
      categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
    }

    // Build demand patterns
    const patterns: DemandPattern[] = Object.entries(resourceMap).map(([id, data]) => {
      const totalLoans = data.loans.length;
      const avgLoansPerDay = totalLoans / 30;
      const peakDayIndex = data.dayCounts.indexOf(Math.max(...data.dayCounts));
      const peakHour = data.hourCounts.indexOf(Math.max(...data.hourCounts));

      // Calculate trend (compare last 15 days vs first 15 days)
      const midPoint = subDays(new Date(), 15);
      const recentLoans = data.loans.filter((d) => d >= midPoint).length;
      const olderLoans = data.loans.filter((d) => d < midPoint).length;

      let trend: "up" | "down" | "stable" = "stable";
      if (recentLoans > olderLoans * 1.2) trend = "up";
      else if (recentLoans < olderLoans * 0.8) trend = "down";

      // Predict demand
      let predictedDemand: "high" | "medium" | "low" = "medium";
      if (avgLoansPerDay >= 1) predictedDemand = "high";
      else if (avgLoansPerDay >= 0.5) predictedDemand = "medium";
      else predictedDemand = "low";

      return {
        resourceId: id,
        resourceName: data.name,
        categoryName: data.category,
        totalLoans,
        avgLoansPerDay,
        peakDay: dayNames[peakDayIndex],
        peakHour,
        trend,
        predictedDemand,
      };
    });

    // Sort by total loans
    patterns.sort((a, b) => b.totalLoans - a.totalLoans);
    setDemandPatterns(patterns.slice(0, 10));

    // Build hourly pattern
    const hourlyData: TimePattern[] = globalHourCounts.map((count, hour) => ({
      hour,
      loans: count,
      label: `${hour.toString().padStart(2, "0")}:00`,
    }));
    setHourlyPattern(hourlyData);

    // Build daily pattern
    const dailyData: DayPattern[] = globalDayCounts.map((count, day) => ({
      day: dayNames[day],
      loans: count,
      dayNumber: day,
    }));
    setDailyPattern(dailyData);

    // Build category distribution
    const colors = [
      "hsl(var(--primary))",
      "hsl(var(--accent))",
      "hsl(var(--success))",
      "hsl(var(--warning))",
      "hsl(var(--info))",
      "hsl(var(--destructive))",
    ];
    const categoryData = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length],
      }));
    setCategoryDistribution(categoryData);

    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const peakHour = hourlyPattern.reduce((max, curr) => (curr.loans > max.loans ? curr : max), hourlyPattern[0]);
  const peakDay = dailyPattern.reduce((max, curr) => (curr.loans > max.loans ? curr : max), dailyPattern[0]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Hora Pico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{peakHour?.label || "N/A"}</p>
            <p className="text-xs text-muted-foreground">{peakHour?.loans || 0} préstamos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Día Pico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{peakDay?.day || "N/A"}</p>
            <p className="text-xs text-muted-foreground">{peakDay?.loans || 0} préstamos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Alta Demanda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{demandPatterns.filter((p) => p.predictedDemand === "high").length}</p>
            <p className="text-xs text-muted-foreground">recursos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Tendencia Positiva
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{demandPatterns.filter((p) => p.trend === "up").length}</p>
            <p className="text-xs text-muted-foreground">recursos en aumento</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="hourly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hourly">Por Hora</TabsTrigger>
          <TabsTrigger value="daily">Por Día</TabsTrigger>
          <TabsTrigger value="categories">Por Categoría</TabsTrigger>
          <TabsTrigger value="resources">Recursos</TabsTrigger>
        </TabsList>

        <TabsContent value="hourly">
          <Card>
            <CardHeader>
              <CardTitle>Distribución Horaria</CardTitle>
              <CardDescription>Préstamos por hora del día (últimos 30 días)</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={hourlyPattern}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="loans" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>Distribución Semanal</CardTitle>
              <CardDescription>Préstamos por día de la semana (últimos 30 días)</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={dailyPattern}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="loans" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Categoría</CardTitle>
              <CardDescription>Proporción de préstamos por categoría de recurso</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row items-center gap-8">
                <ChartContainer config={chartConfig} className="h-[300px] w-full lg:w-1/2">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={categoryDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="space-y-3 w-full lg:w-1/2">
                  {categoryDistribution.map((cat, index) => (
                    <div key={cat.name} className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="flex-1 text-sm">{cat.name}</span>
                      <Badge variant="secondary">{cat.value}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <CardTitle>Top Recursos por Demanda</CardTitle>
              <CardDescription>Análisis de demanda y predicciones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {demandPatterns.map((pattern, index) => (
                  <div
                    key={pattern.resourceId}
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{pattern.resourceName}</p>
                        {pattern.trend === "up" && (
                          <TrendingUp className="h-4 w-4 text-success" />
                        )}
                        {pattern.trend === "down" && (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{pattern.categoryName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{pattern.totalLoans} préstamos</p>
                      <p className="text-xs text-muted-foreground">
                        Pico: {pattern.peakDay} {pattern.peakHour}:00
                      </p>
                    </div>
                    <Badge
                      variant={
                        pattern.predictedDemand === "high"
                          ? "destructive"
                          : pattern.predictedDemand === "medium"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {pattern.predictedDemand === "high" ? "Alta" : pattern.predictedDemand === "medium" ? "Media" : "Baja"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Recomendaciones del Sistema
          </CardTitle>
          <CardDescription>Sugerencias basadas en el análisis de demanda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {demandPatterns.filter((p) => p.predictedDemand === "high").length > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/30">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Alta demanda detectada</p>
                  <p className="text-xs text-muted-foreground">
                    Considere adquirir más unidades de: {demandPatterns.filter((p) => p.predictedDemand === "high").map((p) => p.resourceName).join(", ")}
                  </p>
                </div>
              </div>
            )}
            {peakHour && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-info/10 border border-info/30">
                <Clock className="h-5 w-5 text-info shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Hora pico identificada</p>
                  <p className="text-xs text-muted-foreground">
                    La mayor demanda ocurre a las {peakHour.label}. Considere tener más personal disponible en este horario.
                  </p>
                </div>
              </div>
            )}
            {peakDay && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
                <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Día de mayor actividad</p>
                  <p className="text-xs text-muted-foreground">
                    {peakDay.day} es el día con más préstamos. Planifique recursos adicionales para este día.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
