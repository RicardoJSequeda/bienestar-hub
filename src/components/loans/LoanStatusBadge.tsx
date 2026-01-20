import { Badge } from "@/components/ui/badge";
import { 
  Clock, CheckCircle, XCircle, Package, AlertTriangle, 
  Hourglass, Ban, Timer, Users 
} from "lucide-react";

const statusConfig = {
  pending: { 
    label: "Pendiente", 
    variant: "secondary" as const, 
    icon: Clock, 
    color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" 
  },
  approved: { 
    label: "Aprobado", 
    variant: "default" as const, 
    icon: CheckCircle, 
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" 
  },
  rejected: { 
    label: "Rechazado", 
    variant: "destructive" as const, 
    icon: XCircle, 
    color: "bg-destructive/10 text-destructive border-destructive/20" 
  },
  active: { 
    label: "Activo", 
    variant: "default" as const, 
    icon: Package, 
    color: "bg-success/10 text-success border-success/20" 
  },
  returned: { 
    label: "Devuelto", 
    variant: "outline" as const, 
    icon: CheckCircle, 
    color: "bg-muted text-muted-foreground" 
  },
  overdue: { 
    label: "Vencido", 
    variant: "destructive" as const, 
    icon: AlertTriangle, 
    color: "bg-destructive/10 text-destructive border-destructive/20" 
  },
  lost: { 
    label: "Perdido", 
    variant: "destructive" as const, 
    icon: Ban, 
    color: "bg-destructive/10 text-destructive border-destructive/20" 
  },
  damaged: { 
    label: "Dañado", 
    variant: "destructive" as const, 
    icon: AlertTriangle, 
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" 
  },
  expired: { 
    label: "Expirado", 
    variant: "secondary" as const, 
    icon: Timer, 
    color: "bg-muted text-muted-foreground" 
  },
  queued: { 
    label: "En cola", 
    variant: "secondary" as const, 
    icon: Users, 
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" 
  },
};

interface LoanStatusBadgeProps {
  status: keyof typeof statusConfig;
  showIcon?: boolean;
  className?: string;
}

export function LoanStatusBadge({ status, showIcon = true, className }: LoanStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} ${className}`} variant="outline">
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {config.label}
    </Badge>
  );
}

export function getStatusConfig(status: string) {
  return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
}
