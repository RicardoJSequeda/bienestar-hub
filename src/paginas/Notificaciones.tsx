import { useEffect, useState } from "react";
import { supabase } from "@/servicios/cliente";
import { useAuth } from "@/contextos/ContextoAutenticacion";
import { DashboardLayout } from "@/componentes/diseno/DisenoTablero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { ScrollArea } from "@/componentes/ui/scroll-area";
import {
    Bell,
    CheckCircle2,
    Clock,
    Package,
    UserX,
    TrendingUp,
    X,
    Loader2,
    Trash2,
    BellOff
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "@/ganchos/usar-toast";
import { Link } from "react-router-dom";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/componentes/ui/alert-dialog";

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string | null;
    link: string | null;
    read: boolean;
    created_at: string;
    data: any;
}

export default function NotificationsPage() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "unread">("all");

    const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            fetchNotifications();
        }
    }, [user, filter]);

    const fetchNotifications = async () => {
        if (!user) return;

        let query = supabase
            .from("notifications")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (filter === "unread") {
            query = query.eq("read", false);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching notifications:", error);
            toast({ title: "Error", description: "No se pudieron cargar las notificaciones", variant: "destructive" });
        } else {
            setNotifications(data || []);
        }
        setIsLoading(false);
    };

    const markAsRead = async (id: string) => {
        const { error } = await supabase
            .from("notifications")
            .update({ read: true })
            .eq("id", id);

        if (!error) {
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read: true } : n)
            );
        }
    };

    const markAllAsRead = async () => {
        if (!user) return;
        const { error } = await supabase
            .from("notifications")
            .update({ read: true })
            .eq("user_id", user.id)
            .eq("read", false);

        if (!error) {
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            toast({ title: "Éxito", description: "Todas las notificaciones marcadas como leídas" });
        }
    };

    const confirmDelete = async () => {
        if (!notificationToDelete) return;

        const { error } = await supabase
            .from("notifications")
            .delete()
            .eq("id", notificationToDelete);

        if (!error) {
            setNotifications(prev => prev.filter(n => n.id !== notificationToDelete));
            toast({ title: "Eliminado", description: "Notificación eliminada" });
        }
        setNotificationToDelete(null);
    };

    const handleDeleteClick = (id: string) => {
        setNotificationToDelete(id);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "loan_overdue":
            case "overdue_loan":
                return <Clock className="h-5 w-5 text-destructive" />;
            case "loan_approved":
            case "loan_delivered":
                return <Package className="h-5 w-5 text-primary" />;
            case "damage_reported":
                return <AlertTriangle className="h-5 w-5 text-warning" />;
            case "high_demand":
                return <TrendingUp className="h-5 w-5 text-info" />;
            case "blocked_user":
                return <UserX className="h-5 w-5 text-destructive" />;
            default:
                return <Bell className="h-5 w-5 text-muted-foreground" />;
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Notificaciones</h1>
                        <p className="text-muted-foreground">Mantente al tanto de tus préstamos y eventos</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={filter === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter("all")}
                        >
                            Todas
                        </Button>
                        <Button
                            variant={filter === "unread" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter("unread")}
                        >
                            No leídas
                        </Button>
                        <Button variant="outline" size="sm" onClick={markAllAsRead}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Marcar todas
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <BellOff className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                <p className="text-lg font-medium text-muted-foreground">No tienes notificaciones</p>
                                <p className="text-sm text-muted-foreground">Te avisaremos cuando pase algo importante</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-[calc(100vh-250px)]">
                                <div className="divide-y overflow-hidden rounded-md">
                                    {notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            className={`flex gap-4 p-4 transition-colors hover:bg-muted/50 ${!n.read ? "bg-primary/5" : ""}`}
                                            onClick={() => !n.read && markAsRead(n.id)}
                                        >
                                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${!n.read ? "bg-primary/10" : "bg-muted"}`}>
                                                {getIcon(n.type)}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className={`font-semibold text-sm ${!n.read ? "text-primary" : "text-foreground"}`}>
                                                            {n.title}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {n.message}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <span className="text-[10px] whitespace-nowrap text-muted-foreground uppercase font-bold tracking-wider">
                                                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                                                        </span>
                                                        {!n.read && (
                                                            <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 mt-4 pt-2 border-t border-dashed border-muted">
                                                    {n.link && (
                                                        <Button asChild variant="link" size="sm" className="h-auto p-0 text-primary">
                                                            <Link to={n.link}>Ver detalle</Link>
                                                        </Button>
                                                    )}
                                                    <div className="flex-1" />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteClick(n.id);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>

                <AlertDialog open={!!notificationToDelete} onOpenChange={() => setNotificationToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar notificación?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </DashboardLayout>
    );
}

const AlertTriangle = (props: any) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
    </svg>
);
