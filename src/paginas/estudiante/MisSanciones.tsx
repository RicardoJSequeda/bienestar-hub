import { useEffect, useState } from "react";
import { supabase } from "@/servicios/cliente";
import { useAuth } from "@/contextos/ContextoAutenticacion";
import { DashboardLayout } from "@/componentes/diseno/DisenoTablero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { Textarea } from "@/componentes/ui/textarea";
import { Label } from "@/componentes/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { toast } from "@/ganchos/usar-toast";
import { AlertTriangle, FileText, CheckCircle, XCircle, Clock, Loader2, Send } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/utilidades/utilidades";
import { ListSkeleton } from "@/componentes/ui/skeleton-loaders";

interface Sanction {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  reason: string;
  start_date: string;
  end_date: string | null;
  status: "active" | "completed" | "appealed" | "voided";
  appeal_notes: string | null;
  created_at: string;
  policies: {
    title: string;
    content: string | null;
  } | null;
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

type TabType = "active" | "all";

export default function MySanctions() {
  const { profile } = useAuth();
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("active");

  // Appeal dialog
  const [isAppealDialogOpen, setIsAppealDialogOpen] = useState(false);
  const [selectedSanction, setSelectedSanction] = useState<Sanction | null>(null);
  const [appealNotes, setAppealNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (profile?.user_id) {
      fetchSanctions();
    }
  }, [profile?.user_id]);

  const fetchSanctions = async () => {
    if (!profile?.user_id) return;

    const { data, error } = await supabase
      .from("student_sanctions")
      .select(`
        *,
        institutional_policies!student_sanctions_policy_id_fkey (title, content)
      `)
      .eq("user_id", profile.user_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching sanctions:", error);
      toast({ title: "Error", description: "No se pudieron cargar las sanciones", variant: "destructive" });
    } else {
      setSanctions(data as unknown as Sanction[] || []);
    }
    setIsLoading(false);
  };

  const handleAppeal = async () => {
    if (!selectedSanction || !appealNotes.trim()) return;
    setIsProcessing(true);

    const { error } = await supabase
      .from("student_sanctions")
      .update({
        status: "appealed",
        appeal_notes: appealNotes.trim(),
      } as any)
      .eq("id", selectedSanction.id)
      .eq("status", "active"); // Solo se puede apelar si está activa

    if (error) {
      toast({ title: "Error", description: "No se pudo enviar la apelación", variant: "destructive" });
    } else {
      // Notify admins
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "coordinator"]);

      if (admins) {
        await supabase.from("notifications").insert(
          admins.map(admin => ({
            user_id: admin.user_id,
            type: "appeal_request",
            title: "Nueva apelación de sanción",
            message: `${profile?.full_name} apeló una sanción`,
            link: "/admin/sanctions",
            data: { sanction_id: selectedSanction.id },
          })) as any
        );
      }

      toast({
        title: "Apelación enviada",
        description: "Tu apelación será revisada por un administrador"
      });
      setIsAppealDialogOpen(false);
      setSelectedSanction(null);
      setAppealNotes("");
      fetchSanctions();
    }

    setIsProcessing(false);
  };

  const activeSanctions = sanctions.filter(s => s.status === "active");
  const allSanctions = sanctions;

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "active", label: "Activas", count: activeSanctions.length },
    { key: "all", label: "Todas", count: allSanctions.length },
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <ListSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Sanciones</h1>
          <p className="text-muted-foreground">
            Revisa las sanciones aplicadas y apela si consideras que hay un error
          </p>
        </div>

        {sanctions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <p className="text-muted-foreground">No tienes sanciones registradas</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 pb-2 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all",
                    "hover:bg-primary/5 active:scale-95",
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                  <Badge variant="secondary" className={cn(
                    "ml-1 px-1.5 py-0 h-5 text-[10px]",
                    activeTab === tab.key ? "bg-white/20 text-white" : "bg-card"
                  )}>
                    {tab.count}
                  </Badge>
                </button>
              ))}
            </div>

            {/* Sanctions List */}
            <div className="space-y-4">
              {(activeTab === "active" ? activeSanctions : allSanctions).map((sanction) => {
                const severity = severityConfig[sanction.severity];
                const status = statusConfig[sanction.status];
                const StatusIcon = status.icon;
                const isExpired = sanction.end_date && new Date(sanction.end_date) < new Date();

                return (
                  <Card key={sanction.id} className={cn("overflow-hidden", severity.bg)}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant={severity.variant} className={severity.bg}>
                              {severity.label}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <StatusIcon className={cn("h-4 w-4", status.color)} />
                              <span className={cn("text-sm font-medium", status.color)}>
                                {status.label}
                              </span>
                            </div>
                          </div>
                          <CardTitle className="text-lg">{sanction.reason}</CardTitle>
                          {sanction.policies && (
                            <CardDescription className="mt-1">
                              Política: {sanction.policies.title}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">Fecha de inicio</p>
                          <p className="font-medium">
                            {format(new Date(sanction.start_date), "d 'de' MMMM yyyy", { locale: es })}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">Fecha de fin</p>
                          <p className={cn("font-medium", isExpired && "text-muted-foreground line-through")}>
                            {sanction.end_date
                              ? format(new Date(sanction.end_date), "d 'de' MMMM yyyy", { locale: es })
                              : "Indefinida"}
                          </p>
                        </div>
                      </div>

                      {sanction.policies?.content && (
                        <div className="rounded-lg bg-background/50 p-3 border">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Contenido de la política:</p>
                          <p className="text-sm">{sanction.policies.content}</p>
                        </div>
                      )}

                      {sanction.status === "appealed" && (
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                            Tu apelación:
                          </p>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            {sanction.appeal_notes}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
                            Pendiente de revisión por administración
                          </p>
                        </div>
                      )}

                      {sanction.status === "active" && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedSanction(sanction);
                            setIsAppealDialogOpen(true);
                          }}
                          className="w-full"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Apelar Sanción
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* Appeal Dialog */}
        <Dialog open={isAppealDialogOpen} onOpenChange={setIsAppealDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Apelar Sanción</DialogTitle>
              <DialogDescription>
                Explica por qué consideras que esta sanción debe ser revisada
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm font-medium mb-1">Motivo de la sanción:</p>
                <p className="text-sm text-muted-foreground">{selectedSanction?.reason}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appeal-notes">Razón de la apelación *</Label>
                <Textarea
                  id="appeal-notes"
                  value={appealNotes}
                  onChange={(e) => setAppealNotes(e.target.value)}
                  placeholder="Explica por qué consideras que esta sanción es incorrecta o injusta..."
                  className="min-h-[120px]"
                />
                <p className="text-xs text-muted-foreground">
                  Tu apelación será revisada por un administrador. Recibirás una notificación con la respuesta.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAppealDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleAppeal}
                disabled={isProcessing || !appealNotes.trim()}
              >
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                Enviar Apelación
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
