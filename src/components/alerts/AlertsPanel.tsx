import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  Clock, 
  Package, 
  UserX, 
  TrendingUp,
  X,
  Loader2
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string | null;
  severity: "info" | "warning" | "error";
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface AlertsPanelProps {
  compact?: boolean;
  maxAlerts?: number;
}

const severityIcons = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
};

const severityColors = {
  info: "bg-info/10 text-info border-info/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  error: "bg-destructive/10 text-destructive border-destructive/30",
};

export function AlertsPanel({ compact = false, maxAlerts = 10 }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchAlerts();
    
    // Subscribe to realtime alerts
    const channel = supabase
      .channel("alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        (payload) => {
          const newAlert = payload.new as Alert;
          setAlerts((prev) => [newAlert, ...prev].slice(0, maxAlerts));
          setUnreadCount((prev) => prev + 1);
          
          // Show toast for new alerts
          toast({
            title: newAlert.title,
            description: newAlert.message || undefined,
            variant: newAlert.severity === "error" ? "destructive" : "default",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [maxAlerts]);

  const fetchAlerts = async () => {
    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(maxAlerts);

    if (!error && data) {
      setAlerts(data as Alert[]);
      setUnreadCount(data.filter((a) => !a.is_read).length);
    }
    setIsLoading(false);
  };

  const markAsRead = async (alertId: string) => {
    await supabase.from("alerts").update({ is_read: true }).eq("id", alertId);
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, is_read: true } : a))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const unreadIds = alerts.filter((a) => !a.is_read).map((a) => a.id);
    if (unreadIds.length === 0) return;

    await supabase.from("alerts").update({ is_read: true }).in("id", unreadIds);
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
    setUnreadCount(0);
  };

  const dismissAlert = async (alertId: string) => {
    await supabase.from("alerts").delete().eq("id", alertId);
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "overdue_loan":
        return Clock;
      case "high_demand":
        return TrendingUp;
      case "blocked_user":
        return UserX;
      case "resource_issue":
        return Package;
      default:
        return Bell;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="relative">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-xs text-destructive-foreground flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Alertas del Sistema
            {unreadCount > 0 && (
              <Badge variant="destructive" className="animate-pulse-soft">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Notificaciones y avisos importantes</CardDescription>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Marcar todas
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-success/50 mb-3" />
            <p className="text-muted-foreground">No hay alertas pendientes</p>
            <p className="text-xs text-muted-foreground">El sistema está funcionando correctamente</p>
          </div>
        ) : (
          <ScrollArea className="h-[350px] pr-4">
            <div className="space-y-3">
              {alerts.map((alert, index) => {
                const SeverityIcon = severityIcons[alert.severity];
                const AlertIcon = getAlertIcon(alert.type);
                
                return (
                  <div
                    key={alert.id}
                    className={`relative flex gap-3 p-3 rounded-lg border transition-all animate-fade-in ${
                      alert.is_read ? "bg-muted/30" : severityColors[alert.severity]
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => !alert.is_read && markAsRead(alert.id)}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      alert.is_read ? "bg-muted" : `bg-${alert.severity}/20`
                    }`}>
                      <AlertIcon className={`h-5 w-5 ${alert.is_read ? "text-muted-foreground" : ""}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-medium text-sm ${alert.is_read ? "text-muted-foreground" : ""}`}>
                          {alert.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissAlert(alert.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      {alert.message && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {alert.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(alert.created_at), { 
                          addSuffix: true, 
                          locale: es 
                        })}
                      </p>
                    </div>
                    {!alert.is_read && (
                      <div className="absolute top-3 right-10 h-2 w-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
