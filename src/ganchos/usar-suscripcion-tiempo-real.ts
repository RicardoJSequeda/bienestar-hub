
import { useEffect } from 'react';
import { supabase } from '@/servicios/cliente';

export function useRealtimeSubscription(
    table: string,
    onChange: () => void,
    filter?: string
) {
    useEffect(() => {
        let timeout: NodeJS.Timeout;

        const handleRealtimeEvent = (payload: any) => {
            console.log(`Change received on ${table}:`, payload);
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                onChange();
            }, 1000); // Wait 1s of silence before refreshing
        };

        const channel = supabase
            .channel(`public:${table}:${filter || 'all'}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table, filter },
                handleRealtimeEvent
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            clearTimeout(timeout);
        };
    }, [table, filter]); // onChange omitted to prevent re-subscription loops
}
