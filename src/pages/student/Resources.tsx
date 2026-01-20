import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Search, Package, Clock, CheckCircle, XCircle, Loader2, SlidersHorizontal, Zap, Users, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSystemSettings } from "@/hooks/use-system-settings";
import { LoanStatusBadge } from "@/components/loans/LoanStatusBadge";

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

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface QueuePosition {
  resource_id: string;
  position: number;
}

interface ActiveLoan {
  resource_id: string;
  status: string;
}

export default function StudentResources() {
  const { profile } = useAuth();
  const { settings } = useSystemSettings();
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [queuePositions, setQueuePositions] = useState<QueuePosition[]>([]);
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [userActiveLoansCount, setUserActiveLoansCount] = useState(0);

  useEffect(() => {
    fetchResources();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (profile?.user_id) {
      fetchUserData();
    }
  }, [profile?.user_id]);

  const fetchResources = async () => {
    const { data, error } = await supabase
      .from("resources")
      .select(`
        *,
        resource_categories (
          id,
          name,
          icon,
          base_wellness_hours,
          hourly_factor,
          is_low_risk,
          requires_approval,
          max_loan_days
        )
      `)
      .neq("status", "retired")
      .order("name");

    if (error) {
      console.error("Error fetching resources:", error);
      toast({ title: "Error", description: "No se pudieron cargar los recursos", variant: "destructive" });
    } else {
      setResources(data as Resource[]);
    }
    setIsLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("resource_categories")
      .select("id, name, icon")
      .order("name");
    
    if (data) setCategories(data);
  };

  const fetchUserData = async () => {
    if (!profile?.user_id) return;

    // Fetch user's queue positions
    const { data: queueData } = await supabase
      .from("resource_queue")
      .select("resource_id, position")
      .eq("user_id", profile.user_id)
      .eq("status", "waiting");

    if (queueData) setQueuePositions(queueData);

    // Fetch user's active/pending loans
    const { data: loansData } = await supabase
      .from("loans")
      .select("resource_id, status")
      .eq("user_id", profile.user_id)
      .in("status", ["pending", "approved", "active"]);

    if (loansData) {
      setActiveLoans(loansData);
      setUserActiveLoansCount(loansData.length);
    }
  };

  const handleRequestLoan = async () => {
    if (!selectedResource || !profile?.user_id) return;

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
    if (selectedResource.status !== "available") {
      // Add to queue if enabled
      if (settings.enable_queue_system) {
        const { data: existingQueue } = await supabase
          .from("resource_queue")
          .select("id")
          .eq("resource_id", selectedResource.id)
          .eq("user_id", profile.user_id)
          .maybeSingle();

        if (existingQueue) {
          toast({
            title: "Ya estás en la cola",
            description: "Te notificaremos cuando el recurso esté disponible",
          });
          setIsRequesting(false);
          setSelectedResource(null);
          return;
        }

        // Get current queue size
        const { count } = await supabase
          .from("resource_queue")
          .select("*", { count: "exact", head: true })
          .eq("resource_id", selectedResource.id)
          .eq("status", "waiting");

        const { error: queueError } = await supabase
          .from("resource_queue")
          .insert({
            resource_id: selectedResource.id,
            user_id: profile.user_id,
            position: (count || 0) + 1,
          });

        if (queueError) {
          toast({ title: "Error", description: "No se pudo unir a la cola", variant: "destructive" });
        } else {
          toast({
            title: "Agregado a la cola",
            description: `Estás en la posición ${(count || 0) + 1}. Te notificaremos cuando esté disponible.`,
          });
          await fetchUserData();
        }
      } else {
        toast({
          title: "Recurso no disponible",
          description: "Este recurso no está disponible actualmente",
          variant: "destructive",
        });
      }
      setIsRequesting(false);
      setSelectedResource(null);
      return;
    }

    // Check if auto-approve is possible
    const canAutoApprove = 
      settings.auto_approve_low_risk && 
      selectedResource.resource_categories?.is_low_risk &&
      !selectedResource.resource_categories?.requires_approval;

    // Check via RPC function for more accurate check
    const { data: autoApproveResult } = await supabase.rpc("can_auto_approve", {
      p_user_id: profile.user_id,
      p_resource_id: selectedResource.id,
    });

    const willAutoApprove = canAutoApprove && autoApproveResult;

    // Create the loan
    const loanData: any = {
      user_id: profile.user_id,
      resource_id: selectedResource.id,
      status: willAutoApprove ? "approved" : "pending",
      auto_approved: willAutoApprove,
    };

    if (willAutoApprove) {
      loanData.approved_at = new Date().toISOString();
    }

    const { error } = await supabase.from("loans").insert(loanData);

    if (error) {
      console.error("Error requesting loan:", error);
      toast({
        title: "Error",
        description: "No se pudo solicitar el préstamo. Intenta de nuevo.",
        variant: "destructive",
      });
    } else {
      // Update resource status if auto-approved
      if (willAutoApprove) {
        await supabase
          .from("resources")
          .update({ status: "reserved" })
          .eq("id", selectedResource.id);
      }

      toast({
        title: willAutoApprove ? "¡Préstamo aprobado!" : "Solicitud enviada",
        description: willAutoApprove 
          ? "Tu préstamo ha sido aprobado automáticamente. Dirígete a recogerlo."
          : "Tu solicitud está pendiente de aprobación.",
      });
      
      await fetchUserData();
      await fetchResources();
      setSelectedResource(null);
    }
    setIsRequesting(false);
  };

  const leaveQueue = async (resourceId: string) => {
    if (!profile?.user_id) return;

    const { error } = await supabase
      .from("resource_queue")
      .delete()
      .eq("resource_id", resourceId)
      .eq("user_id", profile.user_id);

    if (!error) {
      toast({ title: "Saliste de la cola" });
      await fetchUserData();
    }
  };

  const filteredResources = resources.filter((resource) => {
    const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || resource.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusBadge = (resource: Resource) => {
    const queuePos = queuePositions.find(q => q.resource_id === resource.id);
    const activeLoan = activeLoans.find(l => l.resource_id === resource.id);

    if (activeLoan) {
      return <LoanStatusBadge status={activeLoan.status as any} />;
    }

    if (queuePos) {
      return (
        <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">
          <Users className="w-3 h-3 mr-1" />
          Cola #{queuePos.position}
        </Badge>
      );
    }

    switch (resource.status) {
      case "available":
        return (
          <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Disponible
          </Badge>
        );
      case "borrowed":
      case "reserved":
        return (
          <Badge variant="secondary" className="bg-muted">
            <Clock className="w-3 h-3 mr-1" />
            {resource.status === "reserved" ? "Reservado" : "Prestado"}
          </Badge>
        );
      case "maintenance":
        return (
          <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
            <XCircle className="w-3 h-3 mr-1" />
            Mantenimiento
          </Badge>
        );
      default:
        return null;
    }
  };

  const getActionButton = (resource: Resource) => {
    const queuePos = queuePositions.find(q => q.resource_id === resource.id);
    const activeLoan = activeLoans.find(l => l.resource_id === resource.id);

    if (activeLoan) {
      return (
        <Button className="w-full" disabled variant="outline">
          {activeLoan.status === "pending" ? "Pendiente aprobación" : 
           activeLoan.status === "approved" ? "Listo para recoger" : "Préstamo activo"}
        </Button>
      );
    }

    if (queuePos) {
      return (
        <Button 
          className="w-full" 
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            leaveQueue(resource.id);
          }}
        >
          Salir de la cola
        </Button>
      );
    }

    if (resource.status === "available") {
      return (
        <Button className="w-full touch-target" onClick={() => setSelectedResource(resource)}>
          Solicitar Préstamo
        </Button>
      );
    }

    if (settings.enable_queue_system && (resource.status === "borrowed" || resource.status === "reserved")) {
      return (
        <Button 
          className="w-full touch-target" 
          variant="outline"
          onClick={() => setSelectedResource(resource)}
        >
          <Users className="mr-2 h-4 w-4" />
          Unirse a la cola
        </Button>
      );
    }

    return (
      <Button className="w-full" disabled>
        No Disponible
      </Button>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header - Hidden on mobile */}
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold text-foreground">Catálogo de Recursos</h1>
          <p className="text-muted-foreground">
            Explora y solicita préstamos de recursos de bienestar
          </p>
        </div>

        {/* Loan limit warning */}
        {userActiveLoansCount >= settings.max_active_loans && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Has alcanzado el límite de {settings.max_active_loans} préstamos activos</span>
          </div>
        )}

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar recursos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 md:hidden"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <div className="hidden md:block">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mobile Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:hidden">
            <button
              onClick={() => setSelectedCategory("all")}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                "touch-target active-scale",
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                  "touch-target active-scale",
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Resources Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredResources.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No se encontraron recursos</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredResources.map((resource) => (
              <Card key={resource.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 card-touch group">
                {/* Image */}
                <div className="aspect-[4/3] bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden">
                  {resource.image_url ? (
                    <img
                      src={resource.image_url}
                      alt={resource.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                  {/* Status overlay */}
                  <div className="absolute top-3 right-3">
                    {getStatusBadge(resource)}
                  </div>
                  {/* Auto-approve indicator */}
                  {resource.resource_categories?.is_low_risk && !resource.resource_categories?.requires_approval && (
                    <div className="absolute top-3 left-3">
                      <Badge variant="secondary" className="bg-success/90 text-white text-xs">
                        <Zap className="w-3 h-3 mr-0.5" />
                        Aprobación rápida
                      </Badge>
                    </div>
                  )}
                </div>
                
                <CardHeader className="pb-2">
                  <CardTitle className="text-base line-clamp-1">{resource.name}</CardTitle>
                  {resource.resource_categories && (
                    <Badge variant="outline" className="w-fit text-xs">
                      {resource.resource_categories.name}
                    </Badge>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <CardDescription className="line-clamp-2 text-sm min-h-[40px]">
                    {resource.description || "Sin descripción"}
                  </CardDescription>
                  
                  {resource.resource_categories && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex items-center gap-1.5 text-primary font-medium">
                        <Clock className="h-4 w-4" />
                        <span>{resource.resource_categories.base_wellness_hours}h</span>
                      </div>
                      <span className="text-muted-foreground text-xs">de bienestar</span>
                    </div>
                  )}
                  
                  {getActionButton(resource)}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Request Dialog */}
        <Dialog open={!!selectedResource} onOpenChange={() => setSelectedResource(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedResource?.status === "available" ? "Solicitar Préstamo" : "Unirse a la cola"}
              </DialogTitle>
              <DialogDescription>
                {selectedResource?.status === "available" 
                  ? `¿Deseas solicitar el préstamo de "${selectedResource?.name}"?`
                  : `Este recurso no está disponible. ¿Deseas unirte a la cola de espera?`
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedResource?.status === "available" ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {selectedResource?.resource_categories?.is_low_risk && !selectedResource?.resource_categories?.requires_approval
                      ? "Este recurso califica para aprobación automática. ¡Recibirás confirmación inmediata!"
                      : "Tu solicitud será revisada por un administrador. Recibirás una notificación cuando sea aprobada o rechazada."
                    }
                  </p>
                  {selectedResource?.resource_categories && (
                    <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
                      <p className="text-sm font-medium text-muted-foreground">Horas de bienestar estimadas:</p>
                      <p className="text-3xl font-bold text-primary">
                        {selectedResource.resource_categories.base_wellness_hours} horas
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        + {selectedResource.resource_categories.hourly_factor} por hora de uso
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Préstamo máximo: {selectedResource.resource_categories.max_loan_days} días
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl bg-purple-500/5 border border-purple-500/10 p-4">
                  <div className="flex items-center gap-2 text-purple-600 mb-2">
                    <Users className="h-5 w-5" />
                    <span className="font-medium">Cola de espera</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Te notificaremos cuando este recurso esté disponible. Serás el siguiente en la fila.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setSelectedResource(null)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button 
                onClick={handleRequestLoan} 
                disabled={isRequesting || userActiveLoansCount >= settings.max_active_loans} 
                className="w-full sm:w-auto"
              >
                {isRequesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : selectedResource?.status === "available" ? (
                  selectedResource?.resource_categories?.is_low_risk ? (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Confirmar Solicitud
                    </>
                  ) : (
                    "Confirmar Solicitud"
                  )
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Unirse a la cola
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
