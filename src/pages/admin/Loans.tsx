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
import { toast } from "@/hooks/use-toast";
import { Search, Clock, CheckCircle, XCircle, Package, Loader2, ArrowRightLeft, Filter } from "lucide-react";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Loan {
  id: string;
  status: "pending" | "approved" | "rejected" | "active" | "returned" | "overdue";
  requested_at: string;
  approved_at: string | null;
  delivered_at: string | null;
  returned_at: string | null;
  due_date: string | null;
  admin_notes: string | null;
  user_id: string;
  resource_id: string;
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

const statusConfig = {
  pending: { label: "Pendiente", variant: "secondary" as const, icon: Clock, color: "text-yellow-600 dark:text-yellow-400" },
  approved: { label: "Aprobado", variant: "default" as const, icon: CheckCircle, color: "text-blue-600 dark:text-blue-400" },
  rejected: { label: "Rechazado", variant: "destructive" as const, icon: XCircle, color: "text-red-600 dark:text-red-400" },
  active: { label: "Activo", variant: "default" as const, icon: Package, color: "text-green-600 dark:text-green-400" },
  returned: { label: "Devuelto", variant: "outline" as const, icon: CheckCircle, color: "text-muted-foreground" },
  overdue: { label: "Vencido", variant: "destructive" as const, icon: XCircle, color: "text-red-600 dark:text-red-400" },
};

type TabType = "pending" | "approved" | "active" | "history";

export default function AdminLoans() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "deliver" | "return" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("pending");

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
      setLoans(data as unknown as Loan[]);
    }
    setIsLoading(false);
  };

  const handleAction = async () => {
    if (!selectedLoan || !actionType || !user) return;
    setIsProcessing(true);

    let updateData: any = { admin_notes: adminNotes || null };
    let newStatus: string = selectedLoan.status;
    let shouldUpdateResource = false;
    let newResourceStatus: "available" | "borrowed" = "available";
    let shouldAwardHours = false;

    switch (actionType) {
      case "approve":
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user.id;
        newStatus = "approved";
        break;
      case "reject":
        newStatus = "rejected";
        break;
      case "deliver":
        updateData.delivered_at = new Date().toISOString();
        updateData.due_date = dueDate ? new Date(dueDate).toISOString() : addDays(new Date(), 7).toISOString();
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

    if (shouldAwardHours && selectedLoan.resources.resource_categories) {
      const cat = selectedLoan.resources.resource_categories;
      const deliveredAt = selectedLoan.delivered_at ? new Date(selectedLoan.delivered_at) : new Date();
      const hoursUsed = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60);
      const totalHours = cat.base_wellness_hours + (hoursUsed * cat.hourly_factor);

      await supabase.from("wellness_hours").insert({
        user_id: selectedLoan.user_id,
        hours: Math.round(totalHours * 10) / 10,
        source_type: "loan",
        source_id: selectedLoan.id,
        description: `Préstamo: ${selectedLoan.resources.name}`,
        awarded_by: user.id,
      });
    }

    toast({ title: "Éxito", description: "Préstamo actualizado correctamente" });
    setSelectedLoan(null);
    setActionType(null);
    setAdminNotes("");
    setDueDate("");
    setIsProcessing(false);
    fetchLoans();
  };

  const openActionDialog = (loan: Loan, type: "approve" | "reject" | "deliver" | "return") => {
    setSelectedLoan(loan);
    setActionType(type);
    setAdminNotes(loan.admin_notes || "");
    if (type === "deliver") {
      setDueDate(format(addDays(new Date(), 7), "yyyy-MM-dd"));
    }
  };

  const pendingLoans = loans.filter((l) => l.status === "pending");
  const approvedLoans = loans.filter((l) => l.status === "approved");
  const activeLoans = loans.filter((l) => ["active", "overdue"].includes(l.status));
  const historyLoans = loans.filter((l) => ["returned", "rejected"].includes(l.status));

  const getTabLoans = (tab: TabType) => {
    switch (tab) {
      case "pending": return pendingLoans;
      case "approved": return approvedLoans;
      case "active": return activeLoans;
      case "history": return historyLoans;
    }
  };

  const filteredLoans = (loanList: Loan[]) =>
    loanList.filter(
      (l) =>
        l.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.resources?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "pending", label: "Pendientes", count: pendingLoans.length },
    { key: "approved", label: "Aprobados", count: approvedLoans.length },
    { key: "active", label: "Activos", count: activeLoans.length },
    { key: "history", label: "Historial", count: historyLoans.length },
  ];

  const LoanCard = ({ loan }: { loan: Loan }) => {
    const config = statusConfig[loan.status];
    const StatusIcon = config.icon;

    return (
      <Card className="overflow-hidden card-touch">
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="w-full sm:w-24 h-32 sm:h-auto bg-muted shrink-0">
            {loan.resources?.image_url ? (
              <img src={loan.resources.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-8 w-8 text-muted-foreground" />
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
              <Badge variant={config.variant} className="shrink-0">
                <StatusIcon className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>
            </div>

            {/* Student info */}
            <div className="text-sm">
              <p className="font-medium">{loan.profiles?.full_name}</p>
              <p className="text-muted-foreground">{loan.profiles?.student_code || loan.profiles?.email}</p>
            </div>

            {/* Date */}
            <p className="text-xs text-muted-foreground">
              Solicitado: {format(new Date(loan.requested_at), "d MMM yyyy", { locale: es })}
            </p>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
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
                <Button size="sm" onClick={() => openActionDialog(loan, "deliver")} className="w-full sm:w-auto">
                  <ArrowRightLeft className="mr-1 h-3 w-3" />
                  Entregar
                </Button>
              )}
              {loan.status === "active" && (
                <Button size="sm" onClick={() => openActionDialog(loan, "return")} className="w-full sm:w-auto">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Registrar Devolución
                </Button>
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
      default: return "";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header - Hidden on mobile as it's in the nav */}
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold text-foreground">Gestión de Préstamos</h1>
          <p className="text-muted-foreground">Administra las solicitudes y préstamos activos</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por estudiante o recurso..."
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
            {/* Mobile Tabs - Scrollable */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                    "touch-target active-scale",
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
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
              ))}
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
        <Dialog open={!!actionType} onOpenChange={() => { setActionType(null); setSelectedLoan(null); }}>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    + bonificación por tiempo de uso
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
              <Button variant="outline" onClick={() => { setActionType(null); setSelectedLoan(null); }} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button
                onClick={handleAction}
                disabled={isProcessing}
                variant={actionType === "reject" ? "destructive" : "default"}
                className="w-full sm:w-auto"
              >
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
