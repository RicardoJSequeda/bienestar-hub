import { Button } from "@/componentes/ui/button";
import { Share, PlusSquare, X } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogClose } from "@/componentes/ui/dialog";
import { useState, useEffect } from "react";

interface InstruccionesInstalacionPWAProps {
    onDismiss?: () => void;
    isIOS?: boolean;
}

export function InstruccionesInstalacionPWA({ onDismiss, isIOS = false }: InstruccionesInstalacionPWAProps) {
    return (
        <div className="flex flex-col items-center text-center p-4">
            {/* Branding - Logo CORRECTO */}
            <div className="mb-6 bg-white p-4 rounded-2xl shadow-sm border">
                <img
                    src="/logo.png"
                    alt="Logo Institucional"
                    className="w-32 h-auto object-contain"
                />
            </div>

            <h3 className="text-xl font-bold mb-2">Instalar App Institucional</h3>
            <p className="text-muted-foreground mb-6 max-w-xs">
                Obtén acceso rápido a bienestar universitario directamente desde tu pantalla de inicio.
            </p>

            {isIOS ? (
                <div className="w-full bg-muted/50 rounded-xl p-4 text-left space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">1</div>
                        <span className="text-sm">Toca el botón <span className="font-bold">Compartir</span> <Share className="h-4 w-4 inline mx-1" /> en la barra inferior.</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">2</div>
                        <span className="text-sm">Desliza y selecciona <span className="font-bold">"Agregar a Inicio"</span> <PlusSquare className="h-4 w-4 inline mx-1" />.</span>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 w-full">
                    <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        Para instalar, busca la opción <b>"Instalar aplicación"</b> o <b>"Agregar a pantalla de inicio"</b> en el menú de tu navegador.
                    </p>
                </div>
            )}

            {onDismiss && (
                <Button variant="ghost" className="mt-6 w-full" onClick={onDismiss}>
                    Entendido
                </Button>
            )}
        </div>
    );
}
