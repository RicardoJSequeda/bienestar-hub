import { ReactNode } from "react";
import { Card, CardContent } from "@/componentes/ui/card";
import { cn } from "@/utilidades/utilidades";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  variant?: "default" | "primary" | "accent" | "success" | "warning" | "info";
  onClick?: () => void;
  badge?: ReactNode;
  isLoading?: boolean;
}

const variantStyles = {
  default: {
    icon: "bg-muted text-muted-foreground",
    indicator: "bg-muted-foreground",
  },
  primary: {
    icon: "bg-primary/10 text-primary",
    indicator: "bg-primary",
  },
  accent: {
    icon: "bg-accent/20 text-accent-foreground",
    indicator: "bg-accent",
  },
  success: {
    icon: "bg-success/10 text-success",
    indicator: "bg-success",
  },
  warning: {
    icon: "bg-warning/10 text-warning",
    indicator: "bg-warning",
  },
  info: {
    icon: "bg-info/10 text-info",
    indicator: "bg-info",
  },
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "default",
  onClick,
  badge,
  isLoading = false,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        "hover:shadow-card-hover hover:-translate-y-1",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      {/* Top indicator bar */}
      <div className={cn("absolute top-0 left-0 right-0 h-1", styles.indicator)} />
      
      {/* Badge */}
      {badge && (
        <div className="absolute -top-1 -right-1">
          {badge}
        </div>
      )}

      <CardContent className="pt-6 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            {isLoading ? (
              <div className="h-8 w-20 skeleton-loading rounded" />
            ) : (
              <p className="text-2xl font-bold tracking-tight">
                {value}
              </p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
            {trend && (
              <div className="flex items-center gap-1 text-xs">
                <span className={cn(
                  "font-medium",
                  trend.isPositive ? "text-success" : "text-destructive"
                )}>
                  {trend.isPositive ? "+" : ""}{trend.value}%
                </span>
                <span className="text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </div>
          <div className={cn("rounded-xl p-3", styles.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}