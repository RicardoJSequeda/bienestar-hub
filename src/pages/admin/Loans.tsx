import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Search, Clock, CheckCircle, XCircle, Package, Loader2, ArrowRightLeft, Plus, AlertTriangle, Ban, Zap } from "lucide-react";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { LoanStatusBadge } from "@/components/loans/LoanStatusBadge";
import { TrustScoreBadge } from "@/components/loans/TrustScoreBadge";
import { LoanTimelineCard } from "@/components/loans/LoanTimelineCard";
import { PresentialLoanDialog } from "@/components/loans/PresentialLoanDialog";
import { useSystemSettings } from "@/hooks/use-system-settings";

interface Loan {
  id: string;
  status: "pending" | "approved" | "rejected" | "active" | "returned" | "overdue" | "lost" | "damaged" | "expired" | "queued";
  requested_at: string;
  approved_at: string | null;
  delivered_at: string | null;
  returned_at: string | null;
  due_date: string | null;
  pickup_deadline: string | null;
  admin_notes: string | null;
  damage_notes: string | null;
  user_id: string;
  resource_id: string;
  auto_approved: boolean;
  trust_score_at_request: number | null;
  created_by_admin: boolean;
  profiles: { full_name: string; email: string; student_code: string | null };
  resources: {
    id: string;
    name: string;
    image_url: string | null;
    resource_categories: {
      name: string;
      base_wellness_hours: number;
      hourly_factor: number;
    } | null;
  };
}

interface StudentScore {
  trust_score: number;
  is_blocked: boolean;
}

type TabType = "pending" | "approved" | "active" | "issues" | "history";

export default function AdminLoans() {
  const { user } = useAuth();
  const { settings } = useSystemSettings();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [studentScores, setStudentScores] = useState<Record<string, StudentScore>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "deliver" | "return" | "damage" | "lost" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [damageNotes, setDamageNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [showPresentialDialog, setShowPresentialDialog] = useState(false);
  const [showTimelineFor, setShowTimelineFor] = useState<Loan | null>(null);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    const { data, error } = await supabase
      .from("loans")
      .select(`
        *,
        profiles:user_id (full_name, email, student_code),
        resources:resource_id (
          id,
          name,
          image_url,
          resource_categories (name, base_wellness_hours, hourly_factor)
        )
      `)
      .order("requested_at", { ascending: false });

    if (error) {
      console.error("Error fetching loans:", error);
    } else {
      const loansData = data as unknown as Loan[];
      setLoans(loansData);
      
      // Fetch scores for all unique users
      const userIds = [...new Set(loansData.map(l => l.user_id))];
      if (userIds.length > 0) {
        const { data: scores } = await supabase
          .from("student_scores")
          .select("user_id, trust_score, is_blocked")
          .in("user_id", userIds);
        
        if (scores) {
          const scoreMap: Record<string, StudentScore> = {};
          scores.forEach(s => {
            scoreMap[s.user_id] = { trust_score: s.trust_score, is_blocked: s.is_blocked };
          });
          setStudentScores(scoreMap);
        }
      }
    }
    setIsLoading(false);
  };

  const handleAction = async () => {
    if (!selectedLoan || !actionType || !user) return;
    setIsProcessing(true);

    let updateData: any = { admin_notes: adminNotes || null };
    let newStatus: string = selectedLoan.status;
    let shouldUpdateResource = false;
    let newResourceStatus: "available" | "borrowed" | "maintenance" = "available";
    let shouldAwardHours = false;
    let penaltyHours = 0;

    switch (actionType) {
      case "approve":
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user.id;
        updateData.pickup_deadline = addDays(new Date(), 0.5).toISOString(); // 12 hours to pickup
        newStatus = "approved";
        break;
      case "reject":
        newStatus = "rejected";
        break;
      case "deliver":
        updateData.delivered_at = new Date().toISOString();
        updateData.due_date = dueDate ? new Date(dueDate).toISOString() : addDays(new Date(), settings.max_loan_days).toISOString();
        newStatus = "active";
        shouldUpdateResource = true;
        newResourceStatus = "borrowed";
        break;
      case "return":
        updateData.returned_at = new Date().toISOString();
        newStatus = "returned";
        shouldUpdateResource = true;
        newResourceStatus = "available";
        shouldAwardHours = true;
        // Check if late
        if (selectedLoan.due_date && new Date() > new Date(selectedLoan.due_date)) {
          penaltyHours = settings.late_penalty_hours;
        }
        break;
      case "damage":
        updateData.returned_at = new Date().toISOString();
        updateData.damage_notes = damageNotes;
        newStatus = "damaged";
        shouldUpdateResource = true;
        newResourceStatus = "maintenance";
        penaltyHours = settings.damage_penalty_hours;
        break;
      case "lost":
        newStatus = "lost";
        penaltyHours = settings.lost_penalty_hours;
        break;
    }

    updateData.status = newStatus;

    const { error: loanError } = await supabase
      .from("loans")
      .update(updateData)
      .eq("id", selectedLoan.id);

    if (loanError) {
      toast({ title: "Error", description: "No se pudo actualizar el préstamo", variant: "destructive" });
      setIsProcessing(false);
      return;
    }

    if (shouldUpdateResource) {
      await supabase
        .from("resources")
        .update({ status: newResourceStatus })
        .eq("id", selectedLoan.resource_id);
    }

    // Award wellness hours (can be negative for penalties)
    if ((shouldAwardHours || penaltyHours !== 0) && selectedLoan.resources.resource_categories) {
      const cat = selectedLoan.resources.resource_categories;
      let totalHours = 0;

      if (shouldAwardHours) {
        const deliveredAt = selectedLoan.delivered_at ? new Date(selectedLoan.delivered_at) : new Date();
        const hoursUsed = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60);
        totalHours = cat.base_wellness_hours + (hoursUsed * cat.hourly_factor);
      }

      totalHours += penaltyHours;

      await supabase.from("wellness_hours").insert({
        user_id: selectedLoan.user_id,
        hours: Math.round(totalHours * 10) / 10,
        source_type: "loan",
        source_id: selectedLoan.id,
        description: penaltyHours < 0 
          ? `Penalización: ${selectedLoan.resources.name} (${newStatus})`
          : `Préstamo: ${selectedLoan.resources.name}`,
        awarded_by: user.id,
      });

      // Recalculate trust score
      await supabase.rpc("calculate_trust_score", { p_user_id: selectedLoan.user_id });
    }

    // Create alert if there was an issue
    if (newStatus === "damaged" || newStatus === "lost") {
      await supabase.from("alerts").insert({
        type: newStatus === "damaged" ? "resource_damaged" : "resource_lost",
        severity: "warning",
        title: newStatus === "damaged" ? "Recurso dañado" : "Recurso perdido",
        message: `${selectedLoan.resources.name} - ${selectedLoan.profiles.full_name}`,
        entity_type: "loan",
        entity_id: selectedLoan.id,
        target_role: "admin",
      });
    }

    // Log audit
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: `loan_${actionType}`,
      entity_type: "loan",
      entity_id: selectedLoan.id,
      old_data: { status: selectedLoan.status },
      new_data: { status: newStatus },
    });

    toast({ title: "Éxito", description: "Préstamo actualizado correctamente" });
    closeDialog();
    fetchLoans();
  };

  const closeDialog = () => {
    setSelectedLoan(null);
    setActionType(null);
    setAdminNotes("");
    setDamageNotes("");
    setDueDate("");
    setIsProcessing(false);
  };

  const openActionDialog = (loan: Loan, type: typeof actionType) => {
    setSelectedLoan(loan);
    setActionType(type);
    setAdminNotes(loan.admin_notes || "");
    if (type === "deliver") {
      setDueDate(format(addDays(new Date(), settings.max_loan_days), "yyyy-MM-dd"));
    }
  };

  // Categorize loans
  const pendingLoans = loans.filter((l) => l.status === "pending");
  const approvedLoans = loans.filter((l) => l.status === "approved");
  const activeLoans = loans.filter((l) => ["active", "overdue"].includes(l.status));
  const issueLoans = loans.filter((l) => ["lost", "damaged", "expired"].includes(l.status));
  const historyLoans = loans.filter((l) => ["returned", "rejected"].includes(l.status));

  const getTabLoans = (tab: TabType) => {
    switch (tab) {
      case "pending": return pendingLoans;
      case "approved": return approvedLoans;
      case "active": return activeLoans;
      case "issues": return issueLoans;
      case "history": return historyLoans;
    }
  };

  const filteredLoans = (loanList: Loan[]) =>
    loanList.filter(
      (l) =>
        l.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.resources?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.profiles?.student_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const tabs: { key: TabType; label: string; count: number; icon?: React.ElementType }[] = [
    { key: "pending", label: "Pendientes", count: pendingLoans.length },
    { key: "approved", label: "Aprobados", count: approvedLoans.length },
    { key: "active", label: "Activos", count: activeLoans.length },
    { key: "issues", label: "Problemas", count: issueLoans.length, icon: AlertTriangle },
    { key: "history", label: "Historial", count: historyLoans.length },
  ];

  const LoanCard = ({ loan }: { loan: Loan }) => {
    const score = studentScores[loan.user_id];
    const isOverdue = loan.status === "active" && loan.due_date && new Date(loan.due_date) < new Date();

    return (
      <Card className={cn(
        "overflow-hidden card-touch transition-all",
        isOverdue && "border-destructive/50 bg-destructive/5"
      )}>
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="w-full sm:w-28 h-32 sm:h-auto bg-muted shrink-0 relative">
            {loan.resources?.image_url ? (
              <img src={loan.resources.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            {loan.auto_approved && (
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="bg-success/10 text-success text-xs">
                  <Zap className="w-3 h-3 mr-0.5" />
                  Auto
                </Badge>
              </div>
            )}
            {loan.created_by_admin && (
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                  Presencial
                </Badge>
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{loan.resources?.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {loan.resources?.resource_categories?.name}
                </p>
              </div>
              <LoanStatusBadge status={isOverdue ? "overdue" : loan.status} />
            </div>

            {/* Student info */}
            <div className="flex items-center gap-2">
              <div className="flex-1 text-sm">
                <p className="font-medium">{loan.profiles?.full_name}</p>
                <p className="text-muted-foreground">{loan.profiles?.student_code || loan.profiles?.email}</p>
              </div>
              {score && <TrustScoreBadge score={score.trust_score} />}
            </div>

            {/* Dates */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Solicitado: {format(new Date(loan.requested_at), "d MMM", { locale: es })}</span>
              {loan.due_date && (
                <span className={cn(isOverdue && "text-destructive font-medium")}>
                  Vence: {format(new Date(loan.due_date), "d MMM", { locale: es })}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setShowTimelineFor(loan)}
                className="text-xs"
              >
                <Clock className="mr-1 h-3 w-3" />
                Ver timeline
              </Button>
              
              {loan.status === "pending" && (
                <>
                  <Button size="sm" onClick={() => openActionDialog(loan, "approve")} className="flex-1 sm:flex-none">
                    Aprobar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openActionDialog(loan, "reject")} className="flex-1 sm:flex-none">
                    Rechazar
                  </Button>
                </>
              )}
              {loan.status === "approved" && (
                <Button size="sm" onClick={() => openActionDialog(loan, "deliver")} className="flex-1 sm:flex-none">
                  <ArrowRightLeft className="mr-1 h-3 w-3" />
                  Entregar
                </Button>
              )}
              {(loan.status === "active" || isOverdue) && (
                <>
                  <Button size="sm" onClick={() => openActionDialog(loan, "return")} className="flex-1 sm:flex-none">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Devolver
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openActionDialog(loan, "damage")}>
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Daño
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => openActionDialog(loan, "lost")}>
                    <Ban className="mr-1 h-3 w-3" />
                    Perdido
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const getActionTitle = () => {
    switch (actionType) {
      case "approve": return "Aprobar Préstamo";
      case "reject": return "Rechazar Préstamo";
      case "deliver": return "Registrar Entrega";
      case "return": return "Registrar Devolución";
      case "damage": return "Reportar Daño";
      case "lost": return "Reportar Pérdida";
      default: return "";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="hidden md:block">
            <h1 className="text-2xl font-bold text-foreground">Gestión de Préstamos</h1>
            <p className="text-muted-foreground">Administra solicitudes y préstamos activos</p>
          </div>
          <Button onClick={() => setShowPresentialDialog(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Préstamo Presencial
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por estudiante, recurso o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                      "touch-target active-scale",
                      activeTab === tab.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                      tab.key === "issues" && tab.count > 0 && activeTab !== tab.key && "bg-destructive/10 text-destructive"
                    )}
                  >
                    {TabIcon && <TabIcon className="h-3 w-3" />}
                    {tab.label}
                    <span className={cn(
                      "inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs rounded-full",
                      activeTab === tab.key
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-background text-foreground"
                    )}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Loans List */}
            <div className="space-y-3">
              {filteredLoans(getTabLoans(activeTab)).length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No hay préstamos en esta categoría</p>
                  </CardContent>
                </Card>
              ) : (
                filteredLoans(getTabLoans(activeTab)).map((loan) => (
                  <LoanCard key={loan.id} loan={loan} />
                ))
              )}
            </div>
          </>
        )}

        {/* Action Dialog */}
        <Dialog open={!!actionType} onOpenChange={() => closeDialog()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{getActionTitle()}</DialogTitle>
              <DialogDescription>
                {selectedLoan && (
                  <>
                    Recurso: <strong>{selectedLoan.resources?.name}</strong>
                    <br />
                    Estudiante: <strong>{selectedLoan.profiles?.full_name}</strong>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {actionType === "deliver" && (
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Fecha de vencimiento</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="touch-target"
                  />
                </div>
              )}
              
              {actionType === "return" && selectedLoan?.resources?.resource_categories && (
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
                  <p className="text-sm font-medium text-muted-foreground">Horas de bienestar a otorgar:</p>
                  <p className="text-2xl font-bold text-primary">
                    ~{selectedLoan.resources.resource_categories.base_wellness_hours} horas base
                  </p>
                  {selectedLoan.due_date && new Date() > new Date(selectedLoan.due_date) && (
                    <p className="text-xs text-destructive mt-2">
                      ⚠️ Penalización por retraso: {settings.late_penalty_hours} horas
                    </p>
                  )}
                </div>
              )}

              {actionType === "damage" && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-destructive/5 border border-destructive/10 p-4">
                    <p className="text-sm text-destructive">
                      El estudiante recibirá una penalización de {settings.damage_penalty_hours} horas
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción del daño *</Label>
                    <Textarea
                      value={damageNotes}
                      onChange={(e) => setDamageNotes(e.target.value)}
                      placeholder="Describe el daño encontrado..."
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
              )}

              {actionType === "lost" && (
                <div className="rounded-xl bg-destructive/5 border border-destructive/10 p-4">
                  <p className="text-sm text-destructive font-medium">⚠️ Marcar como perdido</p>
                  <p className="text-xs text-destructive mt-1">
                    El estudiante recibirá una penalización de {settings.lost_penalty_hours} horas
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Observaciones sobre este préstamo..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={closeDialog} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button
                onClick={handleAction}
                disabled={isProcessing || (actionType === "damage" && !damageNotes.trim())}
                variant={actionType === "reject" || actionType === "damage" || actionType === "lost" ? "destructive" : "default"}
                className="w-full sm:w-auto"
              >
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Timeline Dialog */}
        <Dialog open={!!showTimelineFor} onOpenChange={() => setShowTimelineFor(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Timeline del préstamo</DialogTitle>
              <DialogDescription>{showTimelineFor?.resources?.name}</DialogDescription>
            </DialogHeader>
            {showTimelineFor && <LoanTimelineCard loan={showTimelineFor} />}
          </DialogContent>
        </Dialog>

        {/* Presential Loan Dialog */}
        <PresentialLoanDialog
          open={showPresentialDialog}
          onOpenChange={setShowPresentialDialog}
          onSuccess={fetchLoans}
        />
      </div>
    </DashboardLayout>
  );
}
