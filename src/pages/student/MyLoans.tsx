import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Clock, CheckCircle, XCircle, Package, Loader2, ChevronRight, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { ListSkeleton } from "@/components/ui/skeleton-loaders";
import { EmptyLoans } from "@/components/ui/empty-states";

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
  approved: { label: "Aprobado - Recoger", variant: "default" as const, icon: CheckCircle, bgColor: "bg-blue-500/10", textColor: "text-blue-600 dark:text-blue-400" },
  rejected: { label: "Rechazado", variant: "destructive" as const, icon: XCircle, bgColor: "bg-red-500/10", textColor: "text-red-600 dark:text-red-400" },
  active: { label: "En uso", variant: "default" as const, icon: Package, bgColor: "bg-green-500/10", textColor: "text-green-600 dark:text-green-400" },
  returned: { label: "Devuelto", variant: "outline" as const, icon: CheckCircle, bgColor: "bg-muted", textColor: "text-muted-foreground" },
  overdue: { label: "Vencido", variant: "destructive" as const, icon: AlertCircle, bgColor: "bg-red-500/10", textColor: "text-red-600 dark:text-red-400" },
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

  useRealtimeSubscription("loans", fetchLoans, `user_id=eq.${profile?.user_id}`);

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
      <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-none shadow-sm bg-card/60 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="w-full sm:w-32 aspect-video sm:aspect-square bg-muted relative overflow-hidden">
            {loan.resources.image_url ? (
              <img
                src={loan.resources.image_url}
                alt={loan.resources.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-8 w-8 text-muted-foreground/30" />
              </div>
            )}
            <div className={cn("absolute inset-0 opacity-20 transition-opacity", config.bgColor)} />
          </div>

          {/* Content */}
          <div className="flex-1 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">{loan.resources.name}</h3>
                  {loan.resources.resource_categories && (
                    <p className="text-xs font-semibold text-primary/70 uppercase tracking-wider">
                      {loan.resources.resource_categories.name}
                    </p>
                  )}
                </div>
                <Badge variant={config.variant} className="shrink-0">
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground/50">Solicitado</span>
                  <span>{formatDate(loan.requested_at)}</span>
                </div>
                {loan.status === "active" && loan.due_date && (
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-red-500/70">Vencimiento</span>
                    <span className="font-medium text-destructive">{formatDate(loan.due_date)}</span>
                  </div>
                )}
                {loan.status === "approved" && (
                  <div className="flex flex-col col-span-2 mt-1">
                    <p className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md">
                      ¡Tu solicitud fue aprobada! Acércate a bienestar para recoger tu recurso.
                    </p>
                  </div>
                )}
                {loan.admin_notes && (
                  <div className="flex flex-col col-span-2 mt-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/50">Nota Admin</span>
                    <span className="italic text-xs">{loan.admin_notes}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <div className="h-8 w-48 bg-muted rounded-md mb-2 animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded-md animate-pulse" />
          </div>
          <ListSkeleton />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header - Hidden on mobile */}
        <div className="hidden md:block">
          <h1 className="text-3xl font-bold tracking-tight">Mis Préstamos</h1>
          <p className="text-muted-foreground">
            Gestiona y revisa el estado de tus solicitudes
          </p>
        </div>

        {loans.length === 0 ? (
          <EmptyLoans />
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
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

            {/* Loans List */}
            <div className="space-y-4">
              {(activeTab === "active" ? activeLoans : historyLoans).length === 0 ? (
                <Card className="border-dashed border-2 bg-transparent shadow-none">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>No hay préstamos en esta categoría</p>
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
