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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Search, Clock, CheckCircle, XCircle, Package, Loader2, ArrowRightLeft } from "lucide-react";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";

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
  pending: { label: "Pendiente", variant: "secondary" as const, icon: Clock },
  approved: { label: "Aprobado", variant: "default" as const, icon: CheckCircle },
  rejected: { label: "Rechazado", variant: "destructive" as const, icon: XCircle },
  active: { label: "Activo", variant: "default" as const, icon: Package },
  returned: { label: "Devuelto", variant: "outline" as const, icon: CheckCircle },
  overdue: { label: "Vencido", variant: "destructive" as const, icon: XCircle },
};

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

    // Update resource status
    if (shouldUpdateResource) {
      await supabase
        .from("resources")
        .update({ status: newResourceStatus })
        .eq("id", selectedLoan.resource_id);
    }

    // Award wellness hours on return
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

  const filteredLoans = (loanList: Loan[]) =>
    loanList.filter(
      (l) =>
        l.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.resources?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const LoanRow = ({ loan }: { loan: Loan }) => {
    const config = statusConfig[loan.status];
    const StatusIcon = config.icon;

    return (
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-3">
            {loan.resources?.image_url ? (
              <img src={loan.resources.image_url} alt="" className="w-10 h-10 rounded object-cover" />
            ) : (
              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="font-medium">{loan.resources?.name}</p>
              <p className="text-sm text-muted-foreground">
                {loan.resources?.resource_categories?.name}
              </p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div>
            <p className="font-medium">{loan.profiles?.full_name}</p>
            <p className="text-sm text-muted-foreground">{loan.profiles?.student_code || loan.profiles?.email}</p>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant={config.variant}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {format(new Date(loan.requested_at), "d MMM yyyy", { locale: es })}
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            {loan.status === "pending" && (
              <>
                <Button size="sm" variant="default" onClick={() => openActionDialog(loan, "approve")}>
                  Aprobar
                </Button>
                <Button size="sm" variant="outline" onClick={() => openActionDialog(loan, "reject")}>
                  Rechazar
                </Button>
              </>
            )}
            {loan.status === "approved" && (
              <Button size="sm" onClick={() => openActionDialog(loan, "deliver")}>
                <ArrowRightLeft className="mr-1 h-3 w-3" />
                Entregar
              </Button>
            )}
            {loan.status === "active" && (
              <Button size="sm" onClick={() => openActionDialog(loan, "return")}>
                <CheckCircle className="mr-1 h-3 w-3" />
                Devolver
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
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
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de Préstamos</h1>
          <p className="text-muted-foreground">Administra las solicitudes y préstamos activos</p>
        </div>

        <div className="relative max-w-sm">
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
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending">
                Pendientes ({pendingLoans.length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Aprobados ({approvedLoans.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                Activos ({activeLoans.length})
              </TabsTrigger>
              <TabsTrigger value="history">
                Historial ({historyLoans.length})
              </TabsTrigger>
            </TabsList>

            {["pending", "approved", "active", "history"].map((tab) => {
              const tabLoans =
                tab === "pending" ? pendingLoans :
                tab === "approved" ? approvedLoans :
                tab === "active" ? activeLoans : historyLoans;

              return (
                <TabsContent key={tab} value={tab}>
                  {filteredLoans(tabLoans).length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No hay préstamos en esta categoría
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Recurso</TableHead>
                            <TableHead>Estudiante</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredLoans(tabLoans).map((loan) => (
                            <LoanRow key={loan.id} loan={loan} />
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        )}

        {/* Action Dialog */}
        <Dialog open={!!actionType} onOpenChange={() => { setActionType(null); setSelectedLoan(null); }}>
          <DialogContent>
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
                  />
                </div>
              )}
              {actionType === "return" && selectedLoan?.resources?.resource_categories && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm font-medium">Horas de bienestar a otorgar:</p>
                  <p className="text-xl font-bold text-primary">
                    ~{selectedLoan.resources.resource_categories.base_wellness_hours} horas base
                  </p>
                  <p className="text-xs text-muted-foreground">
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
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setActionType(null); setSelectedLoan(null); }}>
                Cancelar
              </Button>
              <Button
                onClick={handleAction}
                disabled={isProcessing}
                variant={actionType === "reject" ? "destructive" : "default"}
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
