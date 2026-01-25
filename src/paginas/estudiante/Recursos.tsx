import { useEffect, useState } from "react";
import { supabase } from "@/servicios/cliente";
import { useAuth } from "@/contextos/ContextoAutenticacion";
import { DashboardLayout } from "@/componentes/diseno/DisenoTablero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { Input } from "@/componentes/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { toast } from "@/ganchos/usar-toast";
import { Search, Package, Clock, CheckCircle, XCircle, Loader2, Zap, Users, AlertCircle, ShoppingCart } from "lucide-react";
import { useSystemSettings } from "@/ganchos/usar-configuracion-sistema";
import { LoanStatusBadge } from "@/componentes/prestamos/InsigniaEstadoPrestamo";
import { CardSkeleton, ListSkeleton } from "@/componentes/ui/skeleton-loaders";
import { EmptySearch } from "@/componentes/ui/empty-states";
import { useRealtimeSubscription } from "@/ganchos/usar-suscripcion-tiempo-real";

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
  image_url?: string | null;
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
      .select("id, name, icon, image_url")
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

  // Realtime Subscriptions
  useRealtimeSubscription("resources", fetchResources);
  useRealtimeSubscription("resource_queue", fetchUserData, `user_id=eq.${profile?.user_id}`);
  useRealtimeSubscription("loans", fetchUserData, `user_id=eq.${profile?.user_id}`);

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
      decision_source: willAutoApprove ? "automatic" : "human",
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
        <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 backdrop-blur-md">
          <Users className="w-3 h-3 mr-1" />
          Cola #{queuePos.position}
        </Badge>
      );
    }

    switch (resource.status) {
      case "available":
        return (
          <Badge className="bg-success/90 backdrop-blur-md text-white border-0 shadow-sm">
            <CheckCircle className="w-3 h-3 mr-1" />
            Disponible
          </Badge>
        );
      case "borrowed":
      case "reserved":
        return (
          <Badge variant="secondary" className="bg-muted/90 backdrop-blur-md border border-white/10">
            <Clock className="w-3 h-3 mr-1" />
            {resource.status === "reserved" ? "Reservado" : "Prestado"}
          </Badge>
        );
      case "maintenance":
        return (
          <Badge variant="destructive" className="bg-destructive/90 backdrop-blur-md border border-white/10">
            <XCircle className="w-3 h-3 mr-1" />
            Mantenimiento
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header with Search */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Catálogo de Recursos</h1>
            <p className="text-muted-foreground">Explora y solicita equipamiento universitario</p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar libros, laptops..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 rounded-full bg-background border shadow-sm focus-visible:ring-primary"
            />
          </div>
        </div>

        {/* Loan limit warning */}
        {userActiveLoansCount >= settings.max_active_loans && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/5 text-destructive border border-destructive/10 animate-shake">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="font-medium">Has alcanzado el límite de {settings.max_active_loans} préstamos activos. Devuelve un recurso para solicitar otro.</span>
          </div>
        )}

        {/* Categories Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            className="rounded-full px-6"
            onClick={() => setSelectedCategory('all')}
          >
            Todos
          </Button>
          {categories.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              className="rounded-full px-6 whitespace-nowrap"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </Button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : filteredResources.length === 0 ? (
          <EmptySearch />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredResources.map((resource) => (
              <Card key={resource.id} className="group overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300">
                {/* Image Container */}
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {resource.image_url ? (
                    <img
                      src={resource.image_url}
                      alt={resource.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-accent/5 text-accent/20">
                      <Package className="h-16 w-16" />
                    </div>
                  )}

                  {/* Badges Overlay */}
                  <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                    {getStatusBadge(resource)}
                    {resource.resource_categories?.is_low_risk && !resource.resource_categories?.requires_approval && (
                      <Badge variant="secondary" className="bg-background/80 backdrop-blur text-xs font-bold border-0 shadow-sm">
                        <Zap className="w-3 h-3 mr-1 text-yellow-500 fill-yellow-500" />
                        Instantáneo
                      </Badge>
                    )}
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <Button className="w-full rounded-full bg-white text-black hover:bg-white/90 font-bold" onClick={() => setSelectedResource(resource)}>
                      Ver Detalle
                    </Button>
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="mb-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      {resource.resource_categories?.name}
                    </p>
                    <h3 className="font-bold text-lg leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                      {resource.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{resource.resource_categories?.base_wellness_hours}h crédito</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Request Dialog */}
        <Dialog open={!!selectedResource} onOpenChange={() => setSelectedResource(null)}>
          <DialogContent className="sm:max-w-md overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-primary/20 to-accent/20 -z-10" />
            <DialogHeader className="pt-8">
              <div className="mx-auto bg-background rounded-full p-4 shadow-lg mb-4">
                {selectedResource?.image_url ? (
                  <img src={selectedResource.image_url} className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <Package className="w-16 h-16 text-primary" />
                )}
              </div>
              <DialogTitle className="text-center text-2xl">
                {selectedResource?.name}
              </DialogTitle>
              <DialogDescription className="text-center px-4">
                {selectedResource?.description || "Sin descripción disponible."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 px-4">
              {selectedResource?.status === "available" ? (
                <div className="rounded-xl bg-muted/50 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Crédito Bienestar</span>
                    <span className="font-bold">{selectedResource.resource_categories?.base_wellness_hours} Horas</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tiempo Máximo</span>
                    <span className="font-bold">{selectedResource.resource_categories?.max_loan_days} Días</span>
                  </div>
                  {selectedResource.resource_categories?.is_low_risk && (
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
              <Button variant="ghost" onClick={() => setSelectedResource(null)}>
                Cancelar
              </Button>
              <Button
                onClick={handleRequestLoan}
                disabled={isRequesting || userActiveLoansCount >= settings.max_active_loans}
                className="flex-1 rounded-full"
              >
                {isRequesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : selectedResource?.status === "available" ? (
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
      </div>
    </DashboardLayout>
  );
}
