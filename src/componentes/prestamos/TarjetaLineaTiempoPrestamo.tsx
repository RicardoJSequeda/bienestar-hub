import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, CheckCircle, Package, ArrowRight, AlertTriangle } from "lucide-react";
import { cn } from "@/utilidades/utilidades";

interface TimelineEvent {
  date: string | null;
  label: string;
  icon: React.ElementType;
  status: "completed" | "current" | "upcoming" | "warning";
}

interface LoanTimelineCardProps {
  loan: {
    status: string;
    requested_at: string;
    approved_at: string | null;
    delivered_at: string | null;
    due_date: string | null;
    returned_at: string | null;
    pickup_deadline?: string | null;
  };
  className?: string;
}

export function LoanTimelineCard({ loan, className }: LoanTimelineCardProps) {
  const events: TimelineEvent[] = [
    {
      date: loan.requested_at,
      label: "Solicitado",
      icon: Clock,
      status: "completed",
    },
  ];

  if (loan.approved_at) {
    events.push({
      date: loan.approved_at,
      label: "Aprobado",
      icon: CheckCircle,
      status: "completed",
    });
  } else if (loan.status === "pending") {
    events.push({
      date: null,
      label: "Pendiente aprobación",
      icon: Clock,
      status: "current",
    });
  } else if (loan.status === "rejected") {
    events.push({
      date: null,
      label: "Rechazado",
      icon: AlertTriangle,
      status: "warning",
    });
  }

  if (loan.delivered_at) {
    events.push({
      date: loan.delivered_at,
      label: "Entregado",
      icon: Package,
      status: "completed",
    });
  } else if (loan.status === "approved") {
    events.push({
      date: loan.pickup_deadline || null,
      label: "Pendiente retiro",
      icon: Package,
      status: "current",
    });
  }

  if (loan.returned_at) {
    events.push({
      date: loan.returned_at,
      label: "Devuelto",
      icon: CheckCircle,
      status: "completed",
    });
  } else if (loan.status === "active") {
    const isOverdue = loan.due_date && new Date(loan.due_date) < new Date();
    events.push({
      date: loan.due_date,
      label: isOverdue ? "Vencido" : "Fecha límite",
      icon: isOverdue ? AlertTriangle : ArrowRight,
      status: isOverdue ? "warning" : "upcoming",
    });
  }

  const getStatusColors = (status: TimelineEvent["status"]) => {
    switch (status) {
      case "completed":
        return "bg-success text-success-foreground";
      case "current":
        return "bg-primary text-primary-foreground animate-pulse";
      case "warning":
        return "bg-destructive text-destructive-foreground";
      case "upcoming":
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Estado del préstamo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {events.map((event, index) => {
            const Icon = event.icon;
            const isLast = index === events.length - 1;
            
            return (
              <div key={index} className="flex gap-3 pb-4 last:pb-0">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    getStatusColors(event.status)
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {!isLast && (
                    <div className={cn(
                      "w-0.5 flex-1 my-1",
                      event.status === "completed" ? "bg-success" : "bg-muted"
                    )} />
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 pt-1">
                  <p className="font-medium text-sm">{event.label}</p>
                  {event.date && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(event.date), "d MMM yyyy, HH:mm", { locale: es })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
