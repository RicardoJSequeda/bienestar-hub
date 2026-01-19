import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Clock, CheckCircle, XCircle, Package, Loader2, ChevronRight } from "lucide-react";
import { format } from "date-fns";
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
  pending: { label: "Pendiente", variant: "secondary" as const, icon: Clock, bgColor: "bg-yellow-500/10", textColor: "text-yellow-600 dark:text-yellow-400" },
  approved: { label: "Aprobado", variant: "default" as const, icon: CheckCircle, bgColor: "bg-blue-500/10", textColor: "text-blue-600 dark:text-blue-400" },
  rejected: { label: "Rechazado", variant: "destructive" as const, icon: XCircle, bgColor: "bg-red-500/10", textColor: "text-red-600 dark:text-red-400" },
  active: { label: "Activo", variant: "default" as const, icon: Package, bgColor: "bg-green-500/10", textColor: "text-green-600 dark:text-green-400" },
  returned: { label: "Devuelto", variant: "outline" as const, icon: CheckCircle, bgColor: "bg-muted", textColor: "text-muted-foreground" },
  overdue: { label: "Vencido", variant: "destructive" as const, icon: XCircle, bgColor: "bg-red-500/10", textColor: "text-red-600 dark:text-red-400" },
};

type TabType = "active" | "history";

export default function MyLoans() {
  const { profile } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("active");

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
    return format(new Date(date), "d MMM yyyy", { locale: es });
  };

  const tabs = [
    { key: "active" as TabType, label: "Activos", count: activeLoans.length },
    { key: "history" as TabType, label: "Historial", count: historyLoans.length },
  ];

  const LoanCard = ({ loan }: { loan: Loan }) => {
    const config = statusConfig[loan.status];
    const StatusIcon = config.icon;

    return (
      <Card className="overflow-hidden card-touch">
        <div className="flex">
          {/* Image */}
          <div className="w-20 sm:w-24 shrink-0 bg-muted">
            {loan.resources.image_url ? (
              <img
                src={loan.resources.image_url}
                alt={loan.resources.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full min-h-[80px] flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 p-3 sm:p-4 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base truncate">{loan.resources.name}</h3>
                {loan.resources.resource_categories && (
                  <p className="text-xs text-muted-foreground">
                    {loan.resources.resource_categories.name}
                  </p>
                )}
              </div>
              <Badge variant={config.variant} className="shrink-0 text-xs">
                <StatusIcon className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">{config.label}</span>
              </Badge>
            </div>
            
            <div className="mt-2 space-y-1 text-xs sm:text-sm text-muted-foreground">
              <p>Solicitado: {formatDate(loan.requested_at)}</p>
              {loan.status === "active" && loan.due_date && (
                <p className="text-warning font-medium">Vence: {formatDate(loan.due_date)}</p>
              )}
              {loan.status === "returned" && (
                <p>Devuelto: {formatDate(loan.returned_at)}</p>
              )}
              {loan.admin_notes && (
                <p className="italic line-clamp-1">Nota: {loan.admin_notes}</p>
              )}
            </div>
          </div>
          
          {/* Arrow indicator */}
          <div className="flex items-center px-2 text-muted-foreground">
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header - Hidden on mobile */}
        <div className="hidden md:block">
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
              <div className="rounded-full bg-muted p-4 mb-4">
                <ClipboardList className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium mb-1">No tienes préstamos</p>
              <p className="text-sm text-muted-foreground">Explora el catálogo de recursos para solicitar uno</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 -mx-4 px-4 md:mx-0 md:px-0">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                    "touch-target active-scale",
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.label}
                  <span className={cn(
                    "inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs rounded-full",
                    activeTab === tab.key
                      ? "bg-primary-foreground/20"
                      : "bg-background"
                  )}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Loans List */}
            <div className="space-y-3">
              {(activeTab === "active" ? activeLoans : historyLoans).length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No hay préstamos en esta categoría
                  </CardContent>
                </Card>
              ) : (
                (activeTab === "active" ? activeLoans : historyLoans).map((loan) => (
                  <LoanCard key={loan.id} loan={loan} />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
