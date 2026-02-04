import { useEffect } from 'react';
import { supabase } from '@/servicios/cliente';
import { NotificationService } from '@/servicios/notificaciones';
import { useAuth } from '@/contextos/ContextoAutenticacion';
import { toast } from 'sonner';

export function NativeNotificationListener() {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        // Request permissions on mount
        NotificationService.requestPermissions();

        // 1. Global Notifications Table Listener
        const globalChannel = supabase
            .channel('global-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    const newNotification = payload.new;
                    NotificationService.schedule(
                        newNotification.title,
                        newNotification.message || '',
                        undefined // Auto-ID
                    );
                    toast.info(newNotification.title, {
                        description: newNotification.message,
                    });
                }
            )
            .subscribe();

        // 2. Loans Listener (Approved)
        const loansChannel = supabase
            .channel('loans-updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'loans',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    const newLoan = payload.new;
                    const oldLoan = payload.old;

                    if (oldLoan.status === 'pending' && newLoan.status === 'approved') {
                        const title = "Evaluación de Préstamo";
                        const body = "¡Tu solicitud de préstamo ha sido aprobada!";
                        NotificationService.schedule(title, body);
                        toast.success(title, { description: body });
                    }

                    if (newLoan.status === 'overdue' && oldLoan.status !== 'overdue') {
                        const title = "Préstamo Vencido";
                        const body = "Tienes un préstamo que ha vencido. Por favor devuélvelo.";
                        NotificationService.schedule(title, body);
                        toast.error(title, { description: body });
                    }
                }
            )
            .subscribe();

        // 3. Queue Listener
        const queueChannel = supabase
            .channel('queue-updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'resource_queue',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    const newEntry = payload.new;
                    const oldEntry = payload.old;

                    if (newEntry.status === 'notified' && oldEntry.status !== 'notified') {
                        const title = "¡Es tu turno!";
                        const body = "El recurso que esperabas está disponible. Tienes tiempo limitado para solicitarlo.";
                        NotificationService.schedule(title, body);
                        toast.success(title, { description: body });
                    }
                }
            )
            .subscribe();

        // 4. Sanctions Listener
        const sanctionsChannel = supabase
            .channel('sanctions-updates')
            .on(
                'postgres_changes',
                {
                    event: '*', // Insert or Update
                    schema: 'public',
                    table: 'student_behavioral_status',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    const newStatus = payload.new;
                    // Check if blocked changed to true
                    if (newStatus && newStatus.is_blocked) {
                        const title = "Nueva Sanción";
                        const body = "Has recibido una sanción y tu cuenta ha sido bloqueada temporalmente.";
                        NotificationService.schedule(title, body);
                        toast.error(title, { description: body });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(globalChannel);
            supabase.removeChannel(loansChannel);
            supabase.removeChannel(queueChannel);
            supabase.removeChannel(sanctionsChannel);
        };
    }, [user]);

    return null;
}
