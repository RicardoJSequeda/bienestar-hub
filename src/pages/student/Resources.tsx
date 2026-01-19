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
import { Search, Package, Clock, CheckCircle, XCircle, Loader2, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface Resource {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  status: "available" | "borrowed" | "maintenance";
  category_id: string | null;
  resource_categories: {
    id: string;
    name: string;
    icon: string | null;
    base_wellness_hours: number;
    hourly_factor: number;
  } | null;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

export default function StudentResources() {
  const { profile } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchResources();
    fetchCategories();
  }, []);

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
          hourly_factor
        )
      `)
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

  const handleRequestLoan = async () => {
    if (!selectedResource || !profile?.user_id) return;

    setIsRequesting(true);
    
    const { error } = await supabase
      .from("loans")
      .insert({
        user_id: profile.user_id,
        resource_id: selectedResource.id,
      });

    if (error) {
      console.error("Error requesting loan:", error);
      toast({
        title: "Error",
        description: "No se pudo solicitar el préstamo. Intenta de nuevo.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Solicitud enviada",
        description: "Tu solicitud de préstamo ha sido enviada y está pendiente de aprobación.",
      });
      setSelectedResource(null);
    }
    setIsRequesting(false);
  };

  const filteredResources = resources.filter((resource) => {
    const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || resource.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return (
          <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Disponible
          </Badge>
        );
      case "borrowed":
        return (
          <Badge variant="secondary" className="bg-muted">
            <Clock className="w-3 h-3 mr-1" />
            Prestado
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
          {(showFilters || true) && (
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
          )}
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
                    {getStatusBadge(resource.status)}
                  </div>
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
                  
                  <Button
                    className="w-full touch-target"
                    disabled={resource.status !== "available"}
                    onClick={() => setSelectedResource(resource)}
                  >
                    {resource.status === "available" ? "Solicitar Préstamo" : "No Disponible"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Request Dialog */}
        <Dialog open={!!selectedResource} onOpenChange={() => setSelectedResource(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Solicitar Préstamo</DialogTitle>
              <DialogDescription>
                ¿Deseas solicitar el préstamo de "{selectedResource?.name}"?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Tu solicitud será revisada por un administrador. Recibirás una notificación cuando sea aprobada o rechazada.
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
                </div>
              )}
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setSelectedResource(null)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button onClick={handleRequestLoan} disabled={isRequesting} className="w-full sm:w-auto">
                {isRequesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Confirmar Solicitud"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
