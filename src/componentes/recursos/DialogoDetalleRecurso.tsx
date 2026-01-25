
import { useState } from "react";
import { supabase } from "@/servicios/cliente";
import { useAuth } from "@/contextos/ContextoAutenticacion";
import { useSystemSettings } from "@/ganchos/usar-configuracion-sistema";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { toast } from "@/ganchos/usar-toast";
import { Loader2, Zap, ShoppingCart, Package } from "lucide-react";

interface Resource {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    status: "available" | "borrowed" | "reserved" | "maintenance" | "retired";
    category_id: string | null;
    resource_categories: {
        id: string;
        name: string;
        icon: string | null;
        base_wellness_hours: number;
        hourly_factor: number;
        is_low_risk: boolean;
        requires_approval: boolean;
        max_loan_days: number;
    } | null;
}

interface ResourceDetailDialogProps {
    resource: Resource | null;
    isOpen: boolean;
    onClose: () => void;
    userActiveLoansCount: number;
    onLoanSuccess?: () => void;
}

export function ResourceDetailDialog({
    resource,
    isOpen,
    onClose,
    userActiveLoansCount,
    onLoanSuccess
}: ResourceDetailDialogProps) {
    const { profile } = useAuth();
    const { settings } = useSystemSettings();
    const [isRequesting, setIsRequesting] = useState(false);

    const handleRequestLoan = async () => {
        if (!resource || !profile?.user_id) return;

        // Check loan limit
        if (userActiveLoansCount >= settings.max_active_loans) {
            toast({
                title: "Límite alcanzado",
                description: `Ya tienes ${settings.max_active_loans} préstamos activos. Devuelve uno para solicitar otro.`,
                variant: "destructive",
            });
            return;
        }

        setIsRequesting(true);

        // Check if resource is available
        if (resource.status !== "available") {
            // Add to queue logic could go here, keeping it simple for now or replicating if needed
            // For Quick View, maybe just show not available state implies no action or just queue
            // Let's implement queue simplified
            if (settings.enable_queue_system) {
                // Check existing queue
                const { data: existingQueue } = await supabase
                    .from("resource_queue")
                    .select("id")
                    .eq("resource_id", resource.id)
                    .eq("user_id", profile.user_id)
                    .maybeSingle();

                if (existingQueue) {
                    toast({ title: "Ya estás en la cola", description: "Te notificaremos cuando esté disponible" });
                    setIsRequesting(false);
                    onClose();
                    return;
                }

                const { count } = await supabase
                    .from("resource_queue")
                    .select("*", { count: "exact", head: true })
                    .eq("resource_id", resource.id)
                    .eq("status", "waiting");

                const { error: queueError } = await supabase
                    .from("resource_queue")
                    .insert({
                        resource_id: resource.id,
                        user_id: profile.user_id,
                        position: (count || 0) + 1,
                    });

                if (!queueError) {
                    toast({ title: "Agregado a la cola", description: `Posición: ${(count || 0) + 1}` });
                    onLoanSuccess?.();
                }
            } else {
                toast({ title: "No disponible", description: "Este recurso no se puede solicitar ahora.", variant: "destructive" });
            }
            setIsRequesting(false);
            onClose();
            return;
        }

        // Check if auto-approve is possible
        const canAutoApprove =
            settings.auto_approve_low_risk &&
            resource.resource_categories?.is_low_risk &&
            !resource.resource_categories?.requires_approval;

        const { data: autoApproveResult } = await supabase.rpc("can_auto_approve", {
            p_user_id: profile.user_id,
            p_resource_id: resource.id,
        });

        const willAutoApprove = canAutoApprove && autoApproveResult;

        const loanData: any = {
            user_id: profile.user_id,
            resource_id: resource.id,
            status: willAutoApprove ? "approved" : "pending",
            decision_source: willAutoApprove ? "automatic" : "human",
        };

        if (willAutoApprove) {
            loanData.approved_at = new Date().toISOString();
        }

        const { error } = await supabase.from("loans").insert(loanData);

        if (error) {
            console.error("Error requesting loan:", error);
            toast({ title: "Error", description: "No se pudo solicitar el préstamo.", variant: "destructive" });
        } else {
            if (willAutoApprove) {
                await supabase.from("resources").update({ status: "reserved" }).eq("id", resource.id);
            }
            toast({
                title: willAutoApprove ? "¡Préstamo aprobado!" : "Solicitud enviada",
                description: willAutoApprove
                    ? "Tu préstamo ha sido aprobado automáticamente."
                    : "Tu solicitud está pendiente de aprobación.",
            });
            onLoanSuccess?.();
            onClose();
        }
        setIsRequesting(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-primary/20 to-accent/20 -z-10" />
                <DialogHeader className="pt-8">
                    <div className="mx-auto bg-background rounded-full p-4 shadow-lg mb-4">
                        {resource?.image_url ? (
                            <img src={resource.image_url} className="w-16 h-16 rounded-full object-cover" />
                        ) : (
                            <Package className="w-16 h-16 text-primary" />
                        )}
                    </div>
                    <DialogTitle className="text-center text-2xl">
                        {resource?.name}
                    </DialogTitle>
                    <DialogDescription className="text-center px-4">
                        {resource?.description || "Sin descripción disponible."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2 px-4">
                    {resource?.status === "available" ? (
                        <div className="rounded-xl bg-muted/50 p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Crédito Bienestar</span>
                                <span className="font-bold">{resource.resource_categories?.base_wellness_hours} Horas</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Tiempo Máximo</span>
                                <span className="font-bold">{resource.resource_categories?.max_loan_days} Días</span>
                            </div>
                            {resource.resource_categories?.is_low_risk && (
                                <div className="pt-2 flex items-center gap-2 text-xs text-green-600 font-medium">
                                    <Zap className="w-4 h-4 fill-current" />
                                    <span>Aprobación automática disponible</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-xl bg-orange-500/10 text-orange-700 p-4 text-center text-sm font-medium">
                            Este recurso no está disponible. ¿Deseas unirte a la lista de espera?
                        </div>
                    )}
                </div>

                <DialogFooter className="px-4 pb-4 sm:justify-between gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleRequestLoan}
                        disabled={isRequesting || (userActiveLoansCount >= settings.max_active_loans && resource?.status === 'available')}
                        className="flex-1 rounded-full"
                    >
                        {isRequesting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Procesando...
                            </>
                        ) : resource?.status === "available" ? (
                            <>
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                Solicitar Préstamo
                            </>
                        ) : (
                            "Unirse a la Cola"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
