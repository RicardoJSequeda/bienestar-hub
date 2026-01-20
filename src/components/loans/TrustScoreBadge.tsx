import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

interface TrustScoreBadgeProps {
  score: number;
  showDetails?: boolean;
  className?: string;
}

export function TrustScoreBadge({ score, showDetails = false, className }: TrustScoreBadgeProps) {
  const getScoreInfo = (s: number) => {
    if (s >= 150) return { 
      icon: ShieldCheck, 
      label: "Excelente", 
      color: "bg-success/10 text-success border-success/20",
      description: "Historial impecable"
    };
    if (s >= 100) return { 
      icon: Shield, 
      label: "Bueno", 
      color: "bg-primary/10 text-primary border-primary/20",
      description: "Buen historial"
    };
    if (s >= 70) return { 
      icon: ShieldAlert, 
      label: "Regular", 
      color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      description: "Algunos incidentes"
    };
    return { 
      icon: ShieldX, 
      label: "Bajo", 
      color: "bg-destructive/10 text-destructive border-destructive/20",
      description: "Historial problemático"
    };
  };

  const info = getScoreInfo(score);
  const Icon = info.icon;

  const badge = (
    <Badge variant="outline" className={`${info.color} ${className}`}>
      <Icon className="w-3 h-3 mr-1" />
      {score}
      {showDetails && <span className="ml-1 text-xs opacity-70">({info.label})</span>}
    </Badge>
  );

  if (showDetails) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{info.label}</p>
        <p className="text-xs text-muted-foreground">{info.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
