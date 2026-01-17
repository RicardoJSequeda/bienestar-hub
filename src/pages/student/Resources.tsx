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
import { Search, Package, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";

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
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" />Disponible</Badge>;
      case "borrowed":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Prestado</Badge>;
      case "maintenance":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />En mantenimiento</Badge>;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Catálogo de Recursos</h1>
          <p className="text-muted-foreground">
            Explora y solicita préstamos de recursos de bienestar
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar recursos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredResources.map((resource) => (
              <Card key={resource.id} className="overflow-hidden hover:shadow-md transition-shadow">
                {resource.image_url && (
                  <div className="aspect-video bg-muted">
                    <img
                      src={resource.image_url}
                      alt={resource.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{resource.name}</CardTitle>
                    {getStatusBadge(resource.status)}
                  </div>
                  {resource.resource_categories && (
                    <Badge variant="outline" className="w-fit">
                      {resource.resource_categories.name}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription className="line-clamp-2">
                    {resource.description || "Sin descripción"}
                  </CardDescription>
                  {resource.resource_categories && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {resource.resource_categories.base_wellness_hours} horas base
                      </span>
                    </div>
                  )}
                  <Button
                    className="w-full"
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Préstamo</DialogTitle>
              <DialogDescription>
                ¿Deseas solicitar el préstamo de "{selectedResource?.name}"?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <p className="text-sm text-muted-foreground">
                Tu solicitud será revisada por un administrador. Recibirás una notificación cuando sea aprobada o rechazada.
              </p>
              {selectedResource?.resource_categories && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm font-medium">Horas de bienestar estimadas:</p>
                  <p className="text-2xl font-bold text-primary">
                    {selectedResource.resource_categories.base_wellness_hours} horas
                  </p>
                  <p className="text-xs text-muted-foreground">
                    + {selectedResource.resource_categories.hourly_factor} por hora de uso
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedResource(null)}>
                Cancelar
              </Button>
              <Button onClick={handleRequestLoan} disabled={isRequesting}>
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
