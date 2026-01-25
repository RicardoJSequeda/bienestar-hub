
import { useEffect } from 'react';
import { supabase } from '@/servicios/cliente';

export function useRealtimeSubscription(
    table: string,
    onChange: () => void,
    filter?: string
) {
    useEffect(() => {
        const channel = supabase
            .channel(`public:${table}:${filter || 'all'}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table, filter },
                (payload) => {
                    console.log(`Change received on ${table}:`, payload);
                    onChange();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [table, filter]); // Removed onChange from dependency to avoid loop if not memoized, relying on closure
}
