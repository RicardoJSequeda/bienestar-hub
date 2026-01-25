
import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export function OfflineStatus() {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    if (!isOffline) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-slate-900/90 text-white backdrop-blur-sm py-2 px-4 shadow-lg animate-in slide-in-from-bottom-full transition-all flex items-center justify-center gap-2 text-sm font-medium">
            <WifiOff className="w-4 h-4" />
            <span>Sin conexión a internet. Trabajando en modo offline.</span>
        </div>
    );
}
