import { useEffect, useState } from "react";
import { supabase } from "@/servicios/cliente";
import { useAuth } from "@/contextos/ContextoAutenticacion";
import { DashboardLayout } from "@/componentes/diseno/DisenoTablero";
import { Card, CardContent } from "@/componentes/ui/card";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { Textarea } from "@/componentes/ui/textarea";
import { Label } from "@/componentes/ui/label";
import { Input } from "@/componentes/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/componentes/ui/collapsible";
import { toast } from "@/ganchos/usar-toast";
import { ClipboardList, Clock, CheckCircle, XCircle, Package, Loader2, ChevronRight, AlertCircle, X, CalendarPlus, Star, Download, FileText, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { format, differenceInDays, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/utilidades/utilidades";
import { useRealtimeSubscription } from "@/ganchos/usar-suscripcion-tiempo-real";
import { ListSkeleton } from "@/componentes/ui/skeleton-loaders";
import { EmptyLoans } from "@/componentes/ui/empty-states";

interface Loan {
  id: string;
  status: "pending" | "approved" | "rejected" | "active" | "returned" | "overdue" | "lost" | "damaged" | "expired";
  requested_at: string;
  approved_at: string | null;
  delivered_at: string | null;
  returned_at: string | null;
  due_date: string | null;
  admin_notes: string | null;
  extension_requested: boolean;
  extension_reason: string | null;
  extension_approved: boolean | null;
  rating: number | null;
  rating_comment: string | null;
  resource_id: string;
  resources: {
    id: string;
    name: string;
    image_url: string | null;
    resource_categories: {
      name: string;
      base_wellness_hours: number;
    } | null;
  };
}

const statusConfig = {
  pending: { label: "Pendiente", variant: "secondary" as const, icon: Clock, bgColor: "bg-yellow-500/10", textColor: "text-yellow-600 dark:text-yellow-400" },
  approved: { label: "Aprobado - Recoger", variant: "default" as const, icon: CheckCircle, bgColor: "bg-blue-500/10", textColor: "text-blue-600 dark:text-blue-400" },
  rejected: { label: "Rechazado", variant: "destructive" as const, icon: XCircle, bgColor: "bg-red-500/10", textColor: "text-red-600 dark:text-red-400" },
  active: { label: "En uso", variant: "default" as const, icon: Package, bgColor: "bg-green-500/10", textColor: "text-green-600 dark:text-green-400" },
  returned: { label: "Devuelto", variant: "outline" as const, icon: CheckCircle, bgColor: "bg-muted", textColor: "text-muted-foreground" },
  overdue: { label: "Vencido", variant: "destructive" as const, icon: AlertCircle, bgColor: "bg-red-500/10", textColor: "text-red-600 dark:text-red-400" },
  lost: { label: "Perdido", variant: "destructive" as const, icon: XCircle, bgColor: "bg-red-500/10", textColor: "text-red-600 dark:text-red-400" },
  damaged: { label: "Dañado", variant: "destructive" as const, icon: AlertCircle, bgColor: "bg-orange-500/10", textColor: "text-orange-600 dark:text-orange-400" },
  expired: { label: "Expirado", variant: "secondary" as const, icon: Clock, bgColor: "bg-gray-500/10", textColor: "text-gray-600 dark:text-gray-400" },
};

type TabType = "active" | "history";

export default function MyLoans() {
  const { profile } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("active");
  
  // Diálogos
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  
  // Estados de formularios
  const [extensionReason, setExtensionReason] = useState("");
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Filtros avanzados
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "resource" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (profile?.user_id) {
      fetchLoans();
    }
  }, [profile?.user_id]);

  const fetchLoans = async () => {
    const { data, error } = await supabase
      .from("loans")
      .select(`
        *,
        resources (
          id,
          name,
          image_url,
          resource_categories (
            name,
            base_wellness_hours
          )
        )
      `)
      .eq("user_id", profile!.user_id)
      .order("requested_at", { ascending: false });

    if (error) {
      console.error("Error fetching loans:", error);
    } else {
      setLoans(data as unknown as Loan[]);
    }
    setIsLoading(false);
  };

  useRealtimeSubscription("loans", fetchLoans, `user_id=eq.${profile?.user_id}`);

  // ============================================
  // CANCELAR SOLICITUD PENDIENTE
  // ============================================
  const handleCancelLoan = async () => {
    if (!selectedLoan) return;
    setIsProcessing(true);

    const { error } = await supabase
      .from("loans")
      .delete()
      .eq("id", selectedLoan.id)
      .eq("status", "pending"); // Solo permite cancelar si está pendiente

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cancelar la solicitud",
      });
    } else {
      toast({
        title: "Solicitud cancelada",
        description: "Tu solicitud de préstamo ha sido cancelada",
      });
      fetchLoans();
    }

    setIsProcessing(false);
    setCancelDialogOpen(false);
    setSelectedLoan(null);
  };

  // ============================================
  // SOLICITAR EXTENSIÓN
  // ============================================
  const handleRequestExtension = async () => {
    if (!selectedLoan || !extensionReason.trim()) return;
    setIsProcessing(true);

    const { error } = await supabase
      .from("loans")
      .update({
        extension_requested: true,
        extension_reason: extensionReason.trim(),
        extension_approved: null, // Pendiente de aprobación
      } as any)
      .eq("id", selectedLoan.id)
      .in("status", ["active", "approved"]);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo enviar la solicitud de extensión",
      });
    } else {
      // La notificación se crea automáticamente via trigger en la BD

      toast({
        title: "Solicitud enviada",
        description: "Tu solicitud de extensión será revisada por un administrador",
      });
      fetchLoans();
    }

    setIsProcessing(false);
    setExtensionDialogOpen(false);
    setExtensionReason("");
    setSelectedLoan(null);
  };

  // ============================================
  // CALIFICAR PRÉSTAMO DEVUELTO
  // ============================================
  const handleSubmitRating = async () => {
    if (!selectedLoan || rating === 0) return;
    setIsProcessing(true);

    const updateData: any = {
      rating,
      rating_comment: ratingComment.trim() || null,
    };
    
    const { error } = await supabase
      .from("loans")
      .update(updateData)
      .eq("id", selectedLoan.id)
      .eq("status", "returned");

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la calificación",
      });
    } else {
      toast({
        title: "¡Gracias por tu calificación!",
        description: "Tu opinión nos ayuda a mejorar el servicio",
      });
      fetchLoans();
    }

    setIsProcessing(false);
    setRatingDialogOpen(false);
    setRating(0);
    setRatingComment("");
    setSelectedLoan(null);
  };

  // ============================================
  // EXPORTAR HISTORIAL CSV
  // ============================================
  const exportToCSV = () => {
    const headers = ["Recurso", "Categoría", "Estado", "Fecha Solicitud", "Fecha Vencimiento", "Fecha Devolución", "Horas Bienestar", "Calificación"];
    const rows = loans.map(loan => [
      loan.resources.name,
      loan.resources.resource_categories?.name || "N/A",
      statusConfig[loan.status]?.label || loan.status,
      format(new Date(loan.requested_at), "yyyy-MM-dd"),
      loan.due_date ? format(new Date(loan.due_date), "yyyy-MM-dd") : "N/A",
      loan.returned_at ? format(new Date(loan.returned_at), "yyyy-MM-dd") : "N/A",
      loan.resources.resource_categories?.base_wellness_hours || 0,
      loan.rating ? `${loan.rating}/5` : "Sin calificar",
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `mis-prestamos-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();

    toast({
      title: "Exportado",
      description: "Tu historial se ha descargado como CSV",
    });
  };

  // ============================================
  // EXPORTAR HISTORIAL PDF
  // ============================================
  const exportToPDF = async () => {
    try {
      // Usar jsPDF si está disponible, sino crear HTML y convertir
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      // Encabezado
      doc.setFontSize(18);
      doc.text("Historial de Préstamos", 14, 20);
      doc.setFontSize(10);
      doc.text(`Estudiante: ${profile?.full_name || "N/A"}`, 14, 30);
      doc.text(`Fecha de exportación: ${format(new Date(), "d 'de' MMMM yyyy", { locale: es })}`, 14, 36);

      // Tabla
      let y = 50;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 14;
      const rowHeight = 8;
      const colWidths = [60, 30, 25, 25, 25, 20];

      // Encabezados de tabla
      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.text("Recurso", margin, y);
      doc.text("Estado", margin + colWidths[0], y);
      doc.text("Solicitado", margin + colWidths[0] + colWidths[1], y);
      doc.text("Vencimiento", margin + colWidths[0] + colWidths[1] + colWidths[2], y);
      doc.text("Devolución", margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y);
      doc.text("Horas", margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], y);

      y += rowHeight;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y - 2, 200 - margin, y - 2);

      // Filas de datos
      doc.setFont(undefined, "normal");
      loans.forEach((loan, index) => {
        if (y > pageHeight - 30) {
          doc.addPage();
          y = 20;
        }

        const resourceName = loan.resources.name.length > 25 
          ? loan.resources.name.substring(0, 22) + "..." 
          : loan.resources.name;
        
        doc.text(resourceName, margin, y);
        doc.text(statusConfig[loan.status]?.label || loan.status, margin + colWidths[0], y);
        doc.text(format(new Date(loan.requested_at), "dd/MM/yy"), margin + colWidths[0] + colWidths[1], y);
        doc.text(loan.due_date ? format(new Date(loan.due_date), "dd/MM/yy") : "-", margin + colWidths[0] + colWidths[1] + colWidths[2], y);
        doc.text(loan.returned_at ? format(new Date(loan.returned_at), "dd/MM/yy") : "-", margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y);
        doc.text(String(loan.resources.resource_categories?.base_wellness_hours || 0), margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], y);

        y += rowHeight;
      });

      // Pie de página
      const totalHours = loans.reduce((sum, loan) => sum + (loan.resources.resource_categories?.base_wellness_hours || 0), 0);
      doc.setFont(undefined, "bold");
      doc.text(`Total de horas acumuladas: ${totalHours.toFixed(1)}h`, margin, pageHeight - 10);

      doc.save(`mis-prestamos-${format(new Date(), "yyyy-MM-dd")}.pdf`);

      toast({
        title: "Exportado",
        description: "Tu historial se ha descargado como PDF",
      });
    } catch (error) {
      console.error("Error generando PDF:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar el PDF. Intenta con CSV.",
      });
    }
  };

  // Helpers para abrir diálogos
  const openCancelDialog = (loan: Loan) => {
    setSelectedLoan(loan);
    setCancelDialogOpen(true);
  };

  const openExtensionDialog = (loan: Loan) => {
    setSelectedLoan(loan);
    setExtensionDialogOpen(true);
  };

  const openRatingDialog = (loan: Loan) => {
    setSelectedLoan(loan);
    setRatingDialogOpen(true);
  };

  // Función de filtrado avanzado
  const applyFilters = (loanList: Loan[]) => {
    let filtered = [...loanList];
    
    // Filtro por estado
    if (filterStatus !== "all") {
      filtered = filtered.filter(l => l.status === filterStatus);
    }
    
    // Filtro por fecha (rango)
    if (filterDateFrom) {
      const fromDate = startOfDay(new Date(filterDateFrom));
      filtered = filtered.filter(l => {
        const loanDate = l.requested_at ? new Date(l.requested_at) : null;
        return loanDate && loanDate >= fromDate;
      });
    }
    
    if (filterDateTo) {
      const toDate = endOfDay(new Date(filterDateTo));
      filtered = filtered.filter(l => {
        const loanDate = l.requested_at ? new Date(l.requested_at) : null;
        return loanDate && loanDate <= toDate;
      });
    }
    
    // Ordenamiento
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "date":
          comparison = new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime();
          break;
        case "resource":
          comparison = (a.resources?.name || "").localeCompare(b.resources?.name || "");
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return filtered;
  };

  const activeLoans = loans.filter((l) => ["pending", "approved", "active", "overdue"].includes(l.status));
  const historyLoans = loans.filter((l) => ["returned", "rejected", "lost", "damaged", "expired"].includes(l.status));
  
  // Préstamos devueltos sin calificar
  const unratedLoans = loans.filter((l) => l.status === "returned" && l.rating === null);
  
  // Aplicar filtros según tab activo
  const displayedLoans = activeTab === "active" 
    ? applyFilters(activeLoans)
    : applyFilters(historyLoans);

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return format(new Date(date), "d MMM yyyy", { locale: es });
  };

  const tabs = [
    { key: "active" as TabType, label: "Activos", count: activeLoans.length },
    { key: "history" as TabType, label: "Historial", count: historyLoans.length },
  ];

  const LoanCard = ({ loan }: { loan: Loan }) => {
    const config = statusConfig[loan.status];
    const StatusIcon = config.icon;
    const isOverdue = loan.status === "active" && loan.due_date && new Date(loan.due_date) < new Date();
    const daysUntilDue = loan.due_date ? differenceInDays(new Date(loan.due_date), new Date()) : null;

    return (
      <Card className={cn(
        "overflow-hidden group hover:shadow-lg transition-all duration-300 border-none shadow-sm bg-card/60 backdrop-blur-sm",
        isOverdue && "border-2 border-destructive/50"
      )}>
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="w-full sm:w-32 aspect-video sm:aspect-square bg-muted relative overflow-hidden">
            {loan.resources.image_url ? (
              <img
                src={loan.resources.image_url}
                alt={loan.resources.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-8 w-8 text-muted-foreground/30" />
              </div>
            )}
            <div className={cn("absolute inset-0 opacity-20 transition-opacity", config.bgColor)} />
            
            {/* Extension badge */}
            {loan.extension_requested && (
              <div className="absolute top-2 left-2">
                <Badge variant={loan.extension_approved === true ? "default" : loan.extension_approved === false ? "destructive" : "secondary"} className="text-[10px]">
                  <CalendarPlus className="w-3 h-3 mr-1" />
                  {loan.extension_approved === true ? "Extendido" : loan.extension_approved === false ? "Ext. Rechazada" : "Ext. Pendiente"}
                </Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">{loan.resources.name}</h3>
                  {loan.resources.resource_categories && (
                    <p className="text-xs font-semibold text-primary/70 uppercase tracking-wider">
                      {loan.resources.resource_categories.name}
                    </p>
                  )}
                </div>
                <Badge variant={isOverdue ? "destructive" : config.variant} className="shrink-0">
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {isOverdue ? "Vencido" : config.label}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground/50">Solicitado</span>
                  <span>{formatDate(loan.requested_at)}</span>
                </div>
                {(loan.status === "active" || isOverdue) && loan.due_date && (
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-red-500/70">Vencimiento</span>
                    <span className={cn("font-medium", isOverdue ? "text-destructive" : daysUntilDue !== null && daysUntilDue <= 2 ? "text-orange-500" : "")}>
                      {formatDate(loan.due_date)}
                      {daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 2 && (
                        <span className="text-[10px] ml-1">({daysUntilDue === 0 ? "Hoy" : `${daysUntilDue} día${daysUntilDue > 1 ? "s" : ""}`})</span>
                      )}
                    </span>
                  </div>
                )}
                {loan.status === "approved" && (
                  <div className="flex flex-col col-span-2 mt-1">
                    <p className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md">
                      ¡Tu solicitud fue aprobada! Acércate a bienestar para recoger tu recurso.
                    </p>
                  </div>
                )}
                {loan.admin_notes && (
                  <div className="flex flex-col col-span-2 mt-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/50">Nota Admin</span>
                    <span className="italic text-xs">{loan.admin_notes}</span>
                  </div>
                )}
                
                {/* Rating display for returned loans */}
                {loan.status === "returned" && loan.rating && (
                  <div className="flex flex-col col-span-2 mt-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/50">Tu calificación</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "w-4 h-4",
                            star <= loan.rating! ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              {/* Cancelar solicitud pendiente */}
              {loan.status === "pending" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openCancelDialog(loan)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancelar solicitud
                </Button>
              )}

              {/* Solicitar extensión (solo activos sin extensión pendiente) */}
              {(loan.status === "active" || isOverdue) && !loan.extension_requested && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openExtensionDialog(loan)}
                >
                  <CalendarPlus className="w-3 h-3 mr-1" />
                  Solicitar extensión
                </Button>
              )}

              {/* Calificar préstamo devuelto */}
              {loan.status === "returned" && !loan.rating && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => openRatingDialog(loan)}
                >
                  <Star className="w-3 h-3 mr-1" />
                  Calificar experiencia
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <div className="h-8 w-48 bg-muted rounded-md mb-2 animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded-md animate-pulse" />
          </div>
          <ListSkeleton />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="hidden md:block">
            <h1 className="text-3xl font-bold tracking-tight">Mis Préstamos</h1>
            <p className="text-muted-foreground">
              Gestiona y revisa el estado de tus solicitudes
            </p>
          </div>
          
          {/* Export buttons */}
          {loans.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV} className="w-full sm:w-auto">
                <FileText className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF} className="w-full sm:w-auto">
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          )}
        </div>

        {/* Alert for unrated loans */}
        {unratedLoans.length > 0 && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-3 flex items-center gap-3">
              <Star className="w-5 h-5 text-primary" />
              <p className="text-sm">
                Tienes <strong>{unratedLoans.length}</strong> préstamo{unratedLoans.length > 1 ? "s" : ""} sin calificar. ¡Tu opinión nos ayuda a mejorar!
              </p>
            </CardContent>
          </Card>
        )}

        {loans.length === 0 ? (
          <EmptyLoans />
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all",
                    "hover:bg-primary/5 active:scale-95",
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                  <Badge variant="secondary" className={cn(
                    "ml-1 px-1.5 py-0 h-5 text-[10px]",
                    activeTab === tab.key ? "bg-white/20 text-white" : "bg-card"
                  )}>
                    {tab.count}
                  </Badge>
                </button>
              ))}
            </div>

            {/* Filtros Avanzados */}
            <Collapsible open={showFilters} onOpenChange={setShowFilters}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros Avanzados
                  {showFilters ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="mt-4">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Filtro por Estado */}
                      <div className="space-y-2">
                        <Label>Estado</Label>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {activeTab === "active" ? (
                              <>
                                <SelectItem value="pending">Pendiente</SelectItem>
                                <SelectItem value="approved">Aprobado</SelectItem>
                                <SelectItem value="active">Activo</SelectItem>
                                <SelectItem value="overdue">Vencido</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="returned">Devuelto</SelectItem>
                                <SelectItem value="rejected">Rechazado</SelectItem>
                                <SelectItem value="lost">Perdido</SelectItem>
                                <SelectItem value="damaged">Dañado</SelectItem>
                                <SelectItem value="expired">Expirado</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Filtro por Fecha Desde */}
                      <div className="space-y-2">
                        <Label>Fecha Desde</Label>
                        <Input
                          type="date"
                          value={filterDateFrom}
                          onChange={(e) => setFilterDateFrom(e.target.value)}
                        />
                      </div>

                      {/* Filtro por Fecha Hasta */}
                      <div className="space-y-2">
                        <Label>Fecha Hasta</Label>
                        <Input
                          type="date"
                          value={filterDateTo}
                          onChange={(e) => setFilterDateTo(e.target.value)}
                          min={filterDateFrom}
                        />
                      </div>

                      {/* Ordenamiento */}
                      <div className="space-y-2">
                        <Label>Ordenar por</Label>
                        <div className="flex gap-2">
                          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                            <SelectTrigger className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="date">Fecha</SelectItem>
                              <SelectItem value="resource">Recurso</SelectItem>
                              <SelectItem value="status">Estado</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                          >
                            {sortOrder === "asc" ? "↑" : "↓"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Botón Limpiar Filtros */}
                    {(filterStatus !== "all" || filterDateFrom || filterDateTo || sortBy !== "date" || sortOrder !== "desc") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-4"
                        onClick={() => {
                          setFilterStatus("all");
                          setFilterDateFrom("");
                          setFilterDateTo("");
                          setSortBy("date");
                          setSortOrder("desc");
                        }}
                      >
                        Limpiar Filtros
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Loans List */}
            <div className="space-y-4">
              {displayedLoans.length === 0 ? (
                <Card className="border-dashed border-2 bg-transparent shadow-none">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>No hay préstamos que coincidan con los filtros</p>
                  </CardContent>
                </Card>
              ) : (
                displayedLoans.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} />
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* ========================================== */}
      {/* DIÁLOGO: CANCELAR SOLICITUD */}
      {/* ========================================== */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar solicitud</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas cancelar la solicitud de préstamo para <strong>{selectedLoan?.resources.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Esta acción no se puede deshacer. Si necesitas el recurso más tarde, deberás hacer una nueva solicitud.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} className="w-full sm:w-auto">
              No, mantener
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelLoan}
              disabled={isProcessing}
              className="w-full sm:w-auto"
            >
              {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sí, cancelar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================== */}
      {/* DIÁLOGO: SOLICITAR EXTENSIÓN */}
      {/* ========================================== */}
      <Dialog open={extensionDialogOpen} onOpenChange={setExtensionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar extensión</DialogTitle>
            <DialogDescription>
              Solicita más tiempo para devolver <strong>{selectedLoan?.resources.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium">Fecha actual de vencimiento:</p>
              <p className="text-muted-foreground">
                {selectedLoan?.due_date ? format(new Date(selectedLoan.due_date), "EEEE d 'de' MMMM, yyyy", { locale: es }) : "No definida"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="extension-reason">Motivo de la extensión *</Label>
              <Textarea
                id="extension-reason"
                placeholder="Explica por qué necesitas más tiempo..."
                value={extensionReason}
                onChange={(e) => setExtensionReason(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                La extensión será revisada por un administrador. Si hay otros estudiantes en cola de espera, es posible que no sea aprobada.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setExtensionDialogOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button
              onClick={handleRequestExtension}
              disabled={isProcessing || !extensionReason.trim()}
              className="w-full sm:w-auto"
            >
              {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enviar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================== */}
      {/* DIÁLOGO: CALIFICAR EXPERIENCIA */}
      {/* ========================================== */}
      <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Califica tu experiencia</DialogTitle>
            <DialogDescription>
              ¿Cómo fue tu experiencia con <strong>{selectedLoan?.resources.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Star rating */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      className={cn(
                        "w-10 h-10 transition-colors",
                        star <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/30 hover:text-yellow-400/50"
                      )}
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {rating === 0 && "Selecciona una calificación"}
                {rating === 1 && "Muy malo"}
                {rating === 2 && "Malo"}
                {rating === 3 && "Regular"}
                {rating === 4 && "Bueno"}
                {rating === 5 && "Excelente"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rating-comment">Comentario (opcional)</Label>
              <Textarea
                id="rating-comment"
                placeholder="¿Algún comentario adicional sobre el recurso o el servicio?"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setRatingDialogOpen(false)} className="w-full sm:w-auto">
              Omitir
            </Button>
            <Button
              onClick={handleSubmitRating}
              disabled={isProcessing || rating === 0}
              className="w-full sm:w-auto"
            >
              {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enviar calificación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
