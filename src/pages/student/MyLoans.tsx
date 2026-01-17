import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Clock, CheckCircle, XCircle, Package, Loader2 } from "lucide-react";
import { format } from "date-fns";
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
  resources: {
    id: string;
    name: string;
    image_url: string | null;
    resource_categories: {
      name: string;
      base_wellness_hours: number;
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

export default function MyLoans() {
  const { profile } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profile?.user_id) {
      fetchLoans();
    }
  }, [profile?.user_id]);

  const fetchLoans = async () => {
    const { data, error } = await supabase
      .from("loans")
      .select(`
        *,
        resources (
          id,
          name,
          image_url,
          resource_categories (
            name,
            base_wellness_hours
          )
        )
      `)
      .eq("user_id", profile!.user_id)
      .order("requested_at", { ascending: false });

    if (error) {
      console.error("Error fetching loans:", error);
    } else {
      setLoans(data as unknown as Loan[]);
    }
    setIsLoading(false);
  };

  const activeLoans = loans.filter((l) => ["pending", "approved", "active"].includes(l.status));
  const historyLoans = loans.filter((l) => ["returned", "rejected", "overdue"].includes(l.status));

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return format(new Date(date), "d 'de' MMMM, yyyy", { locale: es });
  };

  const LoanCard = ({ loan }: { loan: Loan }) => {
    const config = statusConfig[loan.status];
    const StatusIcon = config.icon;

    return (
      <Card className="overflow-hidden">
        <div className="flex">
          {loan.resources.image_url && (
            <div className="w-24 h-24 bg-muted shrink-0">
              <img
                src={loan.resources.image_url}
                alt={loan.resources.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{loan.resources.name}</h3>
                {loan.resources.resource_categories && (
                  <p className="text-sm text-muted-foreground">
                    {loan.resources.resource_categories.name}
                  </p>
                )}
              </div>
              <Badge variant={config.variant} className="shrink-0">
                <StatusIcon className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>
            </div>
            <div className="mt-2 text-sm text-muted-foreground space-y-1">
              <p>Solicitado: {formatDate(loan.requested_at)}</p>
              {loan.status === "active" && loan.due_date && (
                <p className="text-warning">Vence: {formatDate(loan.due_date)}</p>
              )}
              {loan.status === "returned" && (
                <p>Devuelto: {formatDate(loan.returned_at)}</p>
              )}
              {loan.admin_notes && (
                <p className="italic">Nota: {loan.admin_notes}</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mis Préstamos</h1>
          <p className="text-muted-foreground">
            Gestiona y revisa el estado de tus préstamos
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : loans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No tienes préstamos registrados</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="active" className="space-y-4">
            <TabsList>
              <TabsTrigger value="active">
                Activos ({activeLoans.length})
              </TabsTrigger>
              <TabsTrigger value="history">
                Historial ({historyLoans.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {activeLoans.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No tienes préstamos activos
                  </CardContent>
                </Card>
              ) : (
                activeLoans.map((loan) => <LoanCard key={loan.id} loan={loan} />)
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {historyLoans.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No hay historial de préstamos
                  </CardContent>
                </Card>
              ) : (
                historyLoans.map((loan) => <LoanCard key={loan.id} loan={loan} />)
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
