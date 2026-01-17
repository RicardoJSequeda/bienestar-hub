import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Download, BarChart3, Package, Calendar, Clock, Users, TrendingUp, Loader2 } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

interface ResourceStats {
  name: string;
  category: string;
  loan_count: number;
  total_hours: number;
}

interface UserStats {
  full_name: string;
  email: string;
  total_hours: number;
  loan_count: number;
  event_count: number;
}

interface MonthlyStats {
  loans: number;
  events: number;
  hours: number;
}

export default function AdminReports() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [resourceStats, setResourceStats] = useState<ResourceStats[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({ loans: 0, events: 0, hours: 0 });

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy", { locale: es }),
    };
  });

  useEffect(() => {
    fetchReports();
  }, [selectedMonth]);

  const fetchReports = async () => {
    setIsLoading(true);
    const [year, month] = selectedMonth.split("-").map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    // Fetch loans for the month
    const { data: loans } = await supabase
      .from("loans")
      .select(`
        id,
        resource_id,
        resources (name, resource_categories (name))
      `)
      .gte("requested_at", startDate.toISOString())
      .lte("requested_at", endDate.toISOString());

    // Fetch events for the month
    const { data: events } = await supabase
      .from("events")
      .select("id")
      .gte("start_date", startDate.toISOString())
      .lte("start_date", endDate.toISOString());

    // Fetch wellness hours for the month
    const { data: hours } = await supabase
      .from("wellness_hours")
      .select("hours, user_id, source_type")
      .gte("awarded_at", startDate.toISOString())
      .lte("awarded_at", endDate.toISOString());

    // Calculate monthly stats
    const totalHours = hours?.reduce((sum, h) => sum + Number(h.hours), 0) || 0;
    setMonthlyStats({
      loans: loans?.length || 0,
      events: events?.length || 0,
      hours: totalHours,
    });

    // Calculate resource stats
    const resourceMap: Record<string, ResourceStats> = {};
    loans?.forEach((loan: any) => {
      const key = loan.resource_id;
      if (!resourceMap[key]) {
        resourceMap[key] = {
          name: loan.resources?.name || "Desconocido",
          category: loan.resources?.resource_categories?.name || "Sin categoría",
          loan_count: 0,
          total_hours: 0,
        };
      }
      resourceMap[key].loan_count++;
    });
    setResourceStats(Object.values(resourceMap).sort((a, b) => b.loan_count - a.loan_count).slice(0, 10));

    // Fetch top users by hours
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email");
    
    const { data: allHours } = await supabase
      .from("wellness_hours")
      .select("user_id, hours, source_type");

    const { data: userLoans } = await supabase
      .from("loans")
      .select("user_id");

    const { data: userEnrollments } = await supabase
      .from("event_enrollments")
      .select("user_id");

    const userMap: Record<string, UserStats> = {};
    profiles?.forEach((p) => {
      userMap[p.user_id] = {
        full_name: p.full_name,
        email: p.email,
        total_hours: 0,
        loan_count: 0,
        event_count: 0,
      };
    });

    allHours?.forEach((h) => {
      if (userMap[h.user_id]) {
        userMap[h.user_id].total_hours += Number(h.hours);
      }
    });

    userLoans?.forEach((l) => {
      if (userMap[l.user_id]) {
        userMap[l.user_id].loan_count++;
      }
    });

    userEnrollments?.forEach((e) => {
      if (userMap[e.user_id]) {
        userMap[e.user_id].event_count++;
      }
    });

    setUserStats(Object.values(userMap).sort((a, b) => b.total_hours - a.total_hours).slice(0, 10));

    setIsLoading(false);
  };

  const exportToExcel = () => {
    // Create CSV content
    let csv = "Reporte de Bienestar Universitario\n";
    csv += `Mes: ${months.find((m) => m.value === selectedMonth)?.label}\n\n`;

    csv += "RESUMEN MENSUAL\n";
    csv += `Préstamos,${monthlyStats.loans}\n`;
    csv += `Eventos,${monthlyStats.events}\n`;
    csv += `Horas otorgadas,${monthlyStats.hours.toFixed(1)}\n\n`;

    csv += "RECURSOS MÁS PRESTADOS\n";
    csv += "Recurso,Categoría,Préstamos\n";
    resourceStats.forEach((r) => {
      csv += `${r.name},${r.category},${r.loan_count}\n`;
    });
    csv += "\n";

    csv += "TOP ESTUDIANTES POR HORAS\n";
    csv += "Nombre,Email,Horas Totales,Préstamos,Eventos\n";
    userStats.forEach((u) => {
      csv += `${u.full_name},${u.email},${u.total_hours.toFixed(1)},${u.loan_count},${u.event_count}\n`;
    });

    // Download CSV
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_bienestar_${selectedMonth}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Exportado", description: "El reporte se ha descargado correctamente" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
            <p className="text-muted-foreground">Estadísticas y análisis del sistema</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={exportToExcel}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Préstamos del Mes
                  </CardTitle>
                  <Package className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{monthlyStats.loans}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Eventos del Mes
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{monthlyStats.events}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Horas Otorgadas
                  </CardTitle>
                  <Clock className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{monthlyStats.hours.toFixed(1)}h</div>
                </CardContent>
              </Card>
            </div>

            {/* Tables */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Recursos Más Prestados
                  </CardTitle>
                  <CardDescription>Top 10 recursos con más préstamos</CardDescription>
                </CardHeader>
                <CardContent>
                  {resourceStats.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No hay datos para este período
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Recurso</TableHead>
                          <TableHead className="text-right">Préstamos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resourceStats.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{r.name}</p>
                                <p className="text-sm text-muted-foreground">{r.category}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">{r.loan_count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Top Estudiantes
                  </CardTitle>
                  <CardDescription>Estudiantes con más horas acumuladas</CardDescription>
                </CardHeader>
                <CardContent>
                  {userStats.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No hay datos disponibles
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Estudiante</TableHead>
                          <TableHead className="text-right">Horas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userStats.map((u, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{u.full_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {u.loan_count} préstamos · {u.event_count} eventos
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium text-primary">
                              {u.total_hours.toFixed(1)}h
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
