
import { useState, useEffect } from "react";
import { X, Share, PlusSquare, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
} from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PWAInstallPrompt() {
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // 1. Check if PWA is already installed
        const isStandaloneMode = window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as any).standalone ||
            document.referrer.includes("android-app://");
        setIsStandalone(isStandaloneMode);

        if (isStandaloneMode) return;

        // 2. Check if user recently dismissed the prompt (7 days cooldown)
        const lastDismissed = localStorage.getItem("pwa_prompt_dismissed");
        if (lastDismissed) {
            const daysSinceDismissal = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24);
            if (daysSinceDismissal < 7) return;
        }

        // 3. Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        // 4. Listen for install prompt (Android/Desktop)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault(); // Prevent default mini-infobar
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsVisible(true);
        };

        // 5. iOS Logic (Show after delay if no native prompt expected)
        if (isIosDevice) {
            setTimeout(() => setIsVisible(true), 3000);
        }

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setDeferredPrompt(null);
            setIsVisible(false);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem("pwa_prompt_dismissed", Date.now().toString());
    };

    if (!isVisible || isStandalone) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-8 md:bottom-8 md:max-w-sm animate-in slide-in-from-bottom-10 fade-in duration-500">
            <Card className="border-l-4 border-l-primary shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
                <div className="absolute top-2 right-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" onClick={handleDismiss}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                <CardContent className="p-4 pt-5">
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Download className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-base mb-1">Instalar App Institucional</h3>
                            <p className="text-sm text-muted-foreground leading-snug mb-3">
                                Accede más rápido a tus préstamos y eventos desde tu pantalla de inicio.
                            </p>

                            {isIOS ? (
                                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-xs space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-white font-bold">1</span>
                                        <span>Toca el botón <span className="font-bold">Compartir</span> <Share className="h-3 w-3 inline mx-1" /></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-white font-bold">2</span>
                                        <span>Selecciona <span className="font-bold">"Agregar a Inicio"</span> <PlusSquare className="h-3 w-3 inline mx-1" /></span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Button onClick={handleInstallClick} size="sm" className="w-full font-bold shadow-sm bg-primary text-white hover:bg-primary/90">
                                        Instalar Ahora
                                    </Button>
                                    <Button onClick={handleDismiss} size="sm" variant="outline" className="w-full">
                                        Quizás luego
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
