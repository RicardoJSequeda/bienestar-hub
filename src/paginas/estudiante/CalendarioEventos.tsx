import { useEffect, useState } from "react";
import { supabase } from "@/servicios/cliente";
import { DashboardLayout } from "@/componentes/diseno/DisenoTablero";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/componentes/ui/card";
import { Calendar } from "@/componentes/ui/calendar";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import { ScrollArea } from "@/componentes/ui/scroll-area";
import {
    Calendar as CalendarIcon,
    MapPin,
    Clock,
    Users,
    ChevronRight,
    Loader2,
    AlertCircle
} from "lucide-react";
import { format, isSameDay, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";

interface Event {
    id: string;
    title: string;
    description: string | null;
    start_date: string;
    end_date: string;
    location: string | null;
    max_participants: number | null;
    current_participants?: number;
    image_url: string | null;
    category_id: string | null;
    event_categories: { name: string } | null;
}

export default function CalendarEvents() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDayEvents, setSelectedDayEvents] = useState<Event[]>([]);

    useEffect(() => {
        fetchMonthEvents();
    }, [date]);

    const fetchMonthEvents = async () => {
        if (!date) return;

        setIsLoading(true);
        const start = startOfMonth(date);
        const end = endOfMonth(date);

        const { data, error } = await supabase
            .from("events")
            .select(`
        *,
        event_categories (name)
      `)
            .gte("start_date", start.toISOString())
            .lte("start_date", end.toISOString())
            .order("start_date", { ascending: true });

        if (!error && data) {
            setEvents(data as any[]);
            // Update selected day events
            const dayEvents = (data as any[]).filter(e => isSameDay(new Date(e.start_date), date));
            setSelectedDayEvents(dayEvents);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (date) {
            const dayEvents = events.filter(e => isSameDay(new Date(e.start_date), date));
            setSelectedDayEvents(dayEvents);
        }
    }, [date, events]);

    const eventDays = events.map(e => new Date(e.start_date));

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Calendario de Eventos</h1>
                        <p className="text-muted-foreground">Explora y planifica tu participación en las actividades</p>
                    </div>
                    <div className="flex gap-2">
                        <Button asChild variant="outline">
                            <Link to="/events">
                                Ver todos los eventos
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <Card className="lg:col-span-5 xl:col-span-4 h-fit">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5 text-primary" />
                                Seleccionar Fecha
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                locale={es}
                                className="rounded-md border shadow-sm"
                                modifiers={{
                                    hasEvent: eventDays
                                }}
                                modifiersStyles={{
                                    hasEvent: {
                                        fontWeight: 'bold',
                                        textDecoration: 'underline',
                                        color: 'var(--primary)'
                                    }
                                }}
                            />
                            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="h-2 w-2 rounded-full bg-primary" />
                                <span>Días con eventos programados</span>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="lg:col-span-7 xl:col-span-8 space-y-4">
                        <Card className="h-full min-h-[500px] flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>Eventos para el {date ? format(date, "PPP", { locale: es }) : "..."}</span>
                                    <Badge variant="secondary">
                                        {selectedDayEvents.length} {selectedDayEvents.length === 1 ? "Evento" : "Eventos"}
                                    </Badge>
                                </CardTitle>
                                <CardDescription>
                                    Actividades programadas para este día
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-24">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                                        <p className="text-muted-foreground">Cargando eventos...</p>
                                    </div>
                                ) : selectedDayEvents.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-24 text-center">
                                        <AlertCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                        <p className="text-lg font-medium text-muted-foreground">No hay eventos este día</p>
                                        <p className="text-sm text-muted-foreground">Prueba seleccionando otra fecha en el calendario</p>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-[450px] pr-4">
                                        <div className="space-y-4">
                                            {selectedDayEvents.map((event) => (
                                                <Link
                                                    key={event.id}
                                                    to={`/events/${event.id}`}
                                                    className="block group"
                                                >
                                                    <div className="p-4 rounded-xl border bg-card hover:bg-accent transition-all duration-300 border-l-4 border-l-primary shadow-sm hover:shadow-md">
                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                            <div className="space-y-2">
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                                                                        {event.event_categories?.name || "General"}
                                                                    </Badge>
                                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                        <Clock className="h-3 w-3" />
                                                                        {format(new Date(event.start_date), "p")} - {format(new Date(event.end_date), "p")}
                                                                    </span>
                                                                </div>
                                                                <h3 className="font-bold text-lg group-hover:text-primary transition-colors line-clamp-1">
                                                                    {event.title}
                                                                </h3>
                                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                                    <span className="flex items-center gap-1">
                                                                        <MapPin className="h-3 w-3" />
                                                                        {event.location || "Por definir"}
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <Users className="h-3 w-3" />
                                                                        {event.max_participants || "∞"} cupos totales
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="shrink-0 flex items-center gap-2">
                                                                <Button size="sm" className="hidden md:flex">
                                                                    Ver detalles
                                                                </Button>
                                                                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
