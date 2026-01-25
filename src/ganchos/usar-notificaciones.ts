import { useState, useEffect } from "react";
import { supabase } from "@/servicios/cliente";
import { useAuth } from "@/contextos/ContextoAutenticacion";
import { toast } from "@/ganchos/usar-toast";

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string | null;
    link: string | null;
    data: any;
    read: boolean;
    created_at: string;
}

export function useNotifications() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const fetchNotifications = async () => {
        if (!user) return;

        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20);

        if (error) {
            console.error("Error fetching notifications:", error);
        } else {
            setNotifications(data || []);
            setUnreadCount(data?.filter((n) => !n.read).length || 0);
        }
        setIsLoading(false);
    };

    const markAsRead = async (notificationId: string) => {
        const { error } = await supabase
            .from("notifications")
            .update({ read: true })
            .eq("id", notificationId);

        if (error) {
            console.error("Error marking notification as read:", error);
        } else {
            setNotifications((prev) =>
                prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        }
    };

    const markAllAsRead = async () => {
        if (!user) return;

        const { error } = await supabase
            .from("notifications")
            .update({ read: true })
            .eq("user_id", user.id)
            .eq("read", false);

        if (error) {
            console.error("Error marking all as read:", error);
        } else {
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
            toast({ title: "Notificaciones marcadas como leídas" });
        }
    };

    useEffect(() => {
        if (!user) return;

        fetchNotifications();

        // Suscripción en tiempo real a nuevas notificaciones
        const channel = supabase
            .channel(`notifications:${user.id}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const newNotification = payload.new as Notification;
                    setNotifications((prev) => [newNotification, ...prev]);
                    setUnreadCount((prev) => prev + 1);

                    // Mostrar toast de notificación
                    toast({
                        title: newNotification.title,
                        description: newNotification.message || "",
                    });
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const updatedNotification = payload.new as Notification;
                    setNotifications((prev) =>
                        prev.map((n) =>
                            n.id === updatedNotification.id ? updatedNotification : n
                        )
                    );

                    // Actualizar contador si cambió el estado de lectura
                    if (updatedNotification.read) {
                        setUnreadCount((prev) => Math.max(0, prev - 1));
                    }
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [user]);

    return {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        refresh: fetchNotifications,
    };
}
