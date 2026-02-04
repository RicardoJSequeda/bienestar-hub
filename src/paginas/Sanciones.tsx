import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/servicios/cliente";
import { useAuth } from "@/contextos/ContextoAutenticacion";
import { DashboardLayout } from "@/componentes/diseno/DisenoTablero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { toast } from "@/ganchos/usar-toast";
import { Search, Plus, AlertTriangle, CheckCircle, XCircle, Clock, Loader2, User, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/utilidades/utilidades";

interface Sanction {
  id: string;
  user_id: string;
  policy_id: string | null;
  severity: "low" | "medium" | "high" | "critical";
  reason: string;
  start_date: string;
  end_date: string | null;
  status: "active" | "completed" | "appealed" | "voided";
  appeal_notes: string | null;
  issued_by: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
    student_code: string | null;
  };
  policies: {
    title: string;
  } | null;
  issuer: {
    full_name: string;
  } | null;
}

interface Policy {
  id: string;
  title: string;
}

const severityConfig = {
  low: { label: "Baja", variant: "secondary" as const, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
  medium: { label: "Media", variant: "default" as const, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20" },
  high: { label: "Alta", variant: "destructive" as const, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
  critical: { label: "Crítica", variant: "destructive" as const, color: "text-red-700", bg: "bg-red-100 dark:bg-red-950/30" },
};

const statusConfig = {
  active: { label: "Activa", icon: AlertTriangle, color: "text-orange-600" },
  completed: { label: "Completada", icon: CheckCircle, color: "text-green-600" },
  appealed: { label: "Apelada", icon: FileText, color: "text-blue-600" },
  voided: { label: "Anulada", icon: XCircle, color: "text-gray-600" },
};

type TabType = "active" | "appealed" | "completed" | "all";

export default function AdminSanctions() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [users, setUsers] = useState<Array<{ user_id: string; full_name: string; email: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("active");

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAppealDialogOpen, setIsAppealDialogOpen] = useState(false);
  const [selectedSanction, setSelectedSanction] = useState<Sanction | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    user_id: "",
    policy_id: "",
    severity: "low" as "low" | "medium" | "high" | "critical",
    reason: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: "",
  });
  const [appealResponse, setAppealResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchData();

    // Si hay un user_id en los query params, abrir diálogo de creación
    const userIdParam = searchParams.get("user");
    if (userIdParam) {
      setFormData(prev => ({ ...prev, user_id: userIdParam }));
      setIsCreateDialogOpen(true);
      // Limpiar query param
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  const fetchData = async () => {
    setIsLoading(true);

    // Fetch sanctions with related data
    const { data: sanctionsData, error: sanctionsError } = await supabase
      .from("student_sanctions")
      .select(`
        *,
        profiles!student_sanctions_user_id_fkey (full_name, email, student_code),
        institutional_policies!student_sanctions_policy_id_fkey (title),
        issuer:profiles!student_sanctions_issued_by_fkey (full_name)
      `)
      .order("created_at", { ascending: false });

    if (sanctionsError) {
      console.error("Error fetching sanctions:", sanctionsError);
      toast({ title: "Error", description: "No se pudieron cargar las sanciones", variant: "destructive" });
    } else {
      // Fetch profiles for user selection
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .order("full_name");

      // Fetch policies
      const { data: policiesData } = await supabase
        .from("institutional_policies")
        .select("id, title")
        .eq("is_active", true)
        .order("title");

      setSanctions(sanctionsData as unknown as Sanction[] || []);
      setUsers(profilesData || []);
      setPolicies(policiesData || []);
    }

    setIsLoading(false);
  };

  const handleCreateSanction = async () => {
    if (!formData.user_id || !formData.reason.trim() || !user) return;
    setIsProcessing(true);

    const insertData: any = {
      user_id: formData.user_id,
      severity: formData.severity,
      reason: formData.reason.trim(),
      start_date: new Date(formData.start_date).toISOString(),
      end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
      issued_by: user.id,
      status: "active",
    };

    if (formData.policy_id) {
      insertData.policy_id = formData.policy_id;
    }

    const { error } = await supabase
      .from("student_sanctions")
      .insert(insertData);

    if (error) {
      toast({ title: "Error", description: "No se pudo crear la sanción", variant: "destructive" });
    } else {
      // Update student behavioral status if critical or high
      if (formData.severity === "critical" || formData.severity === "high") {
        await supabase
          .from("student_behavioral_status")
          .update({ is_blocked: true })
          .eq("user_id", formData.user_id);
      }

      // Create notification
      await supabase.from("notifications").insert({
        user_id: formData.user_id,
        type: "sanction",
        title: "Nueva sanción aplicada",
        message: `Se te ha aplicado una sanción: ${formData.reason}`,
        link: "/my-sanctions",
        data: { severity: formData.severity },
      } as any);

      toast({ title: "Éxito", description: "Sanción creada correctamente" });
      setIsCreateDialogOpen(false);
      setFormData({
        user_id: "",
        policy_id: "",
        severity: "low",
        reason: "",
        start_date: format(new Date(), "yyyy-MM-dd"),
        end_date: "",
      });
      fetchData();
    }

    setIsProcessing(false);
  };

  const handleResolveAppeal = async (approved: boolean) => {
    if (!selectedSanction || !user) return;
    setIsProcessing(true);

    const updateData: any = {
      status: approved ? "voided" : "active",
      appeal_notes: appealResponse.trim() || null,
    };

    const { error } = await supabase
      .from("student_sanctions")
      .update(updateData)
      .eq("id", selectedSanction.id);

    if (error) {
      toast({ title: "Error", description: "No se pudo procesar la apelación", variant: "destructive" });
    } else {
      // Notify student
      await supabase.from("notifications").insert({
        user_id: selectedSanction.user_id,
        type: "appeal_result",
        title: approved ? "Apelación aprobada" : "Apelación rechazada",
        message: approved
          ? "Tu apelación fue aprobada. La sanción ha sido anulada."
          : "Tu apelación fue rechazada. La sanción permanece activa.",
        link: "/my-sanctions",
      } as any);

      toast({
        title: "Éxito",
        description: approved ? "Apelación aprobada" : "Apelación rechazada"
      });
      setIsAppealDialogOpen(false);
      setSelectedSanction(null);
      setAppealResponse("");
      fetchData();
    }

    setIsProcessing(false);
  };

  const handleVoidSanction = async (sanction: Sanction) => {
    if (!confirm("¿Estás seguro de anular esta sanción?")) return;

    const { error } = await supabase
      .from("student_sanctions")
      .update({ status: "voided" } as any)
      .eq("id", sanction.id);

    if (error) {
      toast({ title: "Error", description: "No se pudo anular la sanción", variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: "Sanción anulada" });
      fetchData();
    }
  };

  const getTabSanctions = (tab: TabType) => {
    switch (tab) {
      case "active": return sanctions.filter(s => s.status === "active");
      case "appealed": return sanctions.filter(s => s.status === "appealed");
      case "completed": return sanctions.filter(s => s.status === "completed");
      case "all": return sanctions;
    }
  };

  const filteredSanctions = getTabSanctions(activeTab).filter((s) =>
    s.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "active", label: "Activas", count: sanctions.filter(s => s.status === "active").length },
    { key: "appealed", label: "Apeladas", count: sanctions.filter(s => s.status === "appealed").length },
    { key: "completed", label: "Completadas", count: sanctions.filter(s => s.status === "completed").length },
    { key: "all", label: "Todas", count: sanctions.length },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Gestión de Sanciones</h1>
            <p className="text-muted-foreground">Administra sanciones y apelaciones de estudiantes</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Sanción
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por estudiante o motivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {tab.label}
              <Badge variant="secondary" className={cn(
                "h-5 px-1.5 text-xs",
                activeTab === tab.key ? "bg-primary-foreground/20 text-primary-foreground" : ""
              )}>
                {tab.count}
              </Badge>
            </button>
          ))}
        </div>

        {/* Sanctions Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredSanctions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay sanciones en esta categoría</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Severidad</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Fecha Inicio</TableHead>
                  <TableHead>Fecha Fin</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSanctions.map((sanction) => {
                  const severity = severityConfig[sanction.severity];
                  const status = statusConfig[sanction.status];
                  const StatusIcon = status.icon;
                  const isExpired = sanction.end_date && new Date(sanction.end_date) < new Date();

                  return (
                    <TableRow key={sanction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{sanction.profiles?.full_name || "N/A"}</p>
                            <p className="text-xs text-muted-foreground">{sanction.profiles?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={severity.variant} className={severity.bg}>
                          {severity.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="max-w-xs truncate">{sanction.reason}</p>
                        {sanction.policies && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Política: {sanction.policies.title}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(sanction.start_date), "d MMM yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        {sanction.end_date ? (
                          <span className={cn(isExpired && "text-muted-foreground line-through")}>
                            {format(new Date(sanction.end_date), "d MMM yyyy", { locale: es })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Indefinida</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusIcon className={cn("h-4 w-4", status.color)} />
                          <span className="text-sm">{status.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {sanction.status === "appealed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSanction(sanction);
                                setIsAppealDialogOpen(true);
                              }}
                            >
                              Revisar Apelación
                            </Button>
                          )}
                          {sanction.status === "active" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleVoidSanction(sanction)}
                            >
                              Anular
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Create Sanction Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nueva Sanción</DialogTitle>
              <DialogDescription>
                Aplica una sanción a un estudiante por incumplimiento de políticas
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="user">Estudiante *</Label>
                <Select value={formData.user_id} onValueChange={(value) => setFormData({ ...formData, user_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estudiante" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.full_name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity">Severidad *</Label>
                <Select value={formData.severity} onValueChange={(value: any) => setFormData({ ...formData, severity: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica (Bloquea usuario)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="policy">Política Institucional (opcional)</Label>
                <Select value={formData.policy_id} onValueChange={(value) => setFormData({ ...formData, policy_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una política" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Ninguna</SelectItem>
                    {policies.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Fecha Inicio *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Fecha Fin (opcional)</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    min={formData.start_date}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Motivo de la Sanción *</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Describe el motivo de la sanción..."
                  className="min-h-[100px]"
                />
              </div>

              {(formData.severity === "critical" || formData.severity === "high") && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ Esta sanción bloqueará automáticamente al usuario
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateSanction}
                disabled={isProcessing || !formData.user_id || !formData.reason.trim()}
                variant="destructive"
              >
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Sanción
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Appeal Resolution Dialog */}
        <Dialog open={isAppealDialogOpen} onOpenChange={setIsAppealDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Revisar Apelación</DialogTitle>
              <DialogDescription>
                Sanción de {selectedSanction?.profiles?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <p className="text-sm font-medium">Motivo de la sanción:</p>
                <p className="text-sm text-muted-foreground">{selectedSanction?.reason}</p>
                <p className="text-sm font-medium mt-3">Apelación del estudiante:</p>
                <p className="text-sm text-muted-foreground">{selectedSanction?.appeal_notes || "Sin comentarios"}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appeal-response">Respuesta a la apelación *</Label>
                <Textarea
                  id="appeal-response"
                  value={appealResponse}
                  onChange={(e) => setAppealResponse(e.target.value)}
                  placeholder="Explica tu decisión..."
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAppealDialogOpen(false);
                  setSelectedSanction(null);
                  setAppealResponse("");
                }}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleResolveAppeal(false)}
                disabled={isProcessing || !appealResponse.trim()}
                className="w-full sm:w-auto"
              >
                Rechazar Apelación
              </Button>
              <Button
                onClick={() => handleResolveAppeal(true)}
                disabled={isProcessing || !appealResponse.trim()}
                className="w-full sm:w-auto"
              >
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Aprobar Apelación
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
