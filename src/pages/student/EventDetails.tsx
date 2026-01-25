import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
    Calendar,
    Clock,
    MapPin,
    Users,
    Loader2,
    ChevronLeft,
    CheckCircle,
    ShieldCheck,
    Share2,
    CalendarCheck,
    X
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Event {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    start_date: string;
    end_date: string;
    location: string | null;
    max_participants: number | null;
    wellness_hours: number;
    is_active: boolean;
    event_categories: {
        id: string;
        name: string;
        icon: string | null;
    } | null;
    enrollment_count: number;
    is_enrolled: boolean;
}

export default function EventDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [event, setEvent] = useState<Event | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEnrolling, setIsEnrolling] = useState(false);

    useEffect(() => {
        if (id) {
            fetchEventDetails();
        }
    }, [id, profile?.user_id]);

    const fetchEventDetails = async () => {
        try {
            const { data: eventData, error } = await supabase
                .from("events")
                .select(`
          *,
          event_categories (id, name, icon)
        `)
                .eq("id", id)
                .single();

            if (error) throw error;

            // Fetch enrollment count
            const { count } = await supabase
                .from("event_enrollments")
                .select("*", { count: "exact", head: true })
                .eq("event_id", id);

            // Check if user is enrolled
            let isEnrolled = false;
            if (profile?.user_id) {
                const { data: enrollment } = await supabase
                    .from("event_enrollments")
                    .select("id")
                    .eq("event_id", id)
                    .eq("user_id", profile.user_id)
                    .maybeSingle();
                isEnrolled = !!enrollment;
            }

            setEvent({
                ...eventData,
                enrollment_count: count || 0,
                is_enrolled: isEnrolled,
            });
        } catch (error) {
            console.error("Error fetching event:", error);
            toast({ title: "Error", description: "No se pudo cargar la información del evento", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleEnroll = async () => {
        if (!event || !profile?.user_id) return;

        setIsEnrolling(true);

        const { error } = await supabase
            .from("event_enrollments")
            .insert({
                user_id: profile.user_id,
                event_id: event.id,
            });

        if (error) {
            toast({ title: "Error", description: "No se pudo realizar la inscripción", variant: "destructive" });
        } else {
            toast({ title: "¡Inscripción exitosa!", description: `Te has inscrito a "${event.title}"` });
            setEvent({ ...event, is_enrolled: true, enrollment_count: event.enrollment_count + 1 });
        }
        setIsEnrolling(false);
    };

    const handleUnenroll = async () => {
        if (!event || !profile?.user_id) return;

        const { error } = await supabase
            .from("event_enrollments")
            .delete()
            .eq("user_id", profile.user_id)
            .eq("event_id", event.id);

        if (error) {
            toast({ title: "Error", description: "No se pudo cancelar la inscripción", variant: "destructive" });
        } else {
            toast({ title: "Inscripción cancelada", description: "Has cancelado tu inscripción al evento" });
            setEvent({ ...event, is_enrolled: false, enrollment_count: event.enrollment_count - 1 });
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-[60vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!event) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                    <CalendarCheck className="h-16 w-16 text-muted-foreground/20 mb-4" />
                    <h2 className="text-xl font-bold">Evento no encontrado</h2>
                    <Button variant="link" onClick={() => navigate("/events")}>Volver a eventos</Button>
                </div>
            </DashboardLayout>
        );
    }

    const isFull = event.max_participants ? event.enrollment_count >= event.max_participants : false;
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
                {/* Navigation & Actions */}
                <div className="flex items-center justify-between">
                    <Button variant="ghost" className="gap-2" onClick={() => navigate("/events")}>
                        <ChevronLeft className="h-4 w-4" />
                        Volver a eventos
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon">
                            <Share2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Hero Section */}
                <div className="grid lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3 space-y-6">
                        <div className="aspect-video rounded-3xl overflow-hidden bg-muted border shadow-sm relative">
                            {event.image_url ? (
                                <img
                                    src={event.image_url}
                                    alt={event.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Calendar className="h-20 w-20 text-muted-foreground/20" />
                                </div>
                            )}
                            {event.is_enrolled && (
                                <div className="absolute top-4 left-4">
                                    <Badge className="bg-success text-white px-3 py-1 shadow-lg border-0">
                                        <CheckCircle className="w-4 h-4 mr-1.5" />
                                        Inscrito
                                    </Badge>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {event.event_categories && (
                                    <Badge variant="secondary" className="px-3 py-1">
                                        {event.event_categories.name}
                                    </Badge>
                                )}
                                <Badge variant="outline" className="px-3 py-1 bg-primary/5 border-primary/20 text-primary">
                                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                                    Oficial UCC
                                </Badge>
                            </div>
                            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
                                {event.title}
                            </h1>
                            <div className="prose prose-slate dark:prose-invert max-w-none">
                                <p className="text-lg text-muted-foreground whitespace-pre-wrap">
                                    {event.description || "No hay una descripción detallada para este evento."}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <Card className="border-2 border-primary/10 shadow-xl rounded-3xl overflow-hidden">
                            <CardContent className="p-8 space-y-6">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                            <Calendar className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Fecha</p>
                                            <p className="font-bold text-lg leading-tight">
                                                {format(startDate, "EEEE d 'de' MMMM", { locale: es })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600">
                                            <Clock className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Hora</p>
                                            <p className="font-bold text-lg leading-tight">
                                                {format(startDate, "HH:mm")} - {format(endDate, "HH:mm")}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                                            <MapPin className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Lugar</p>
                                            <p className="font-bold text-lg leading-tight">
                                                {event.location || "Por confirmar"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-success/10 flex items-center justify-center text-success">
                                            <ShieldCheck className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Valor Bienestar</p>
                                            <p className="font-bold text-lg leading-tight">
                                                {event.wellness_hours} Horas Certificadas
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t space-y-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-1.5">
                                            <Users className="h-4 w-4" />
                                            Inscritos
                                        </span>
                                        <span className="font-bold text-foreground">
                                            {event.enrollment_count} {event.max_participants ? `/ ${event.max_participants}` : ""}
                                        </span>
                                    </div>

                                    {event.max_participants && (
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all duration-500"
                                                style={{ width: `${Math.min(100, (event.enrollment_count / event.max_participants) * 100)}%` }}
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-3 pt-2">
                                        {event.is_enrolled ? (
                                            <Button variant="outline" className="w-full h-12 rounded-xl text-destructive hover:bg-destructive/5 hover:text-destructive transition-all" onClick={handleUnenroll}>
                                                <X className="w-4 h-4 mr-2" />
                                                Cancelar Inscripción
                                            </Button>
                                        ) : (
                                            <Button
                                                className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                                disabled={isFull || isEnrolling}
                                                onClick={handleEnroll}
                                            >
                                                {isEnrolling ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Inscribiendo...
                                                    </>
                                                ) : isFull ? (
                                                    "Cupo Agotado"
                                                ) : (
                                                    "Asegurar mi cupo"
                                                )}
                                            </Button>
                                        )}
                                        <p className="text-[10px] text-center text-muted-foreground px-4">
                                            Al inscribirte, te comprometes a asistir puntualmente. Las horas se certificarán tras validar tu asistencia.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="p-6 rounded-3xl bg-muted/40 border space-y-4">
                            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">¿Por qué asistir?</h3>
                            <ul className="space-y-3 text-sm">
                                <li className="flex gap-3">
                                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                                    <span>Obtén horas de bienestar válidas para tu historial académico.</span>
                                </li>
                                <li className="flex gap-3">
                                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                                    <span>Conecta con otros estudiantes de diferentes facultades.</span>
                                </li>
                                <li className="flex gap-3">
                                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                                    <span>Aprende nuevas habilidades fuera del aula de clases habitual.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
