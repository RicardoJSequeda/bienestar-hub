import { useEffect, useState } from "react";
import { supabase } from "@/servicios/cliente";
import { useAuth } from "@/contextos/ContextoAutenticacion";
import { DashboardLayout } from "@/componentes/diseno/DisenoTablero";
import { Card, CardContent } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { Input } from "@/componentes/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/componentes/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { Label } from "@/componentes/ui/label";
import { toast } from "@/ganchos/usar-toast";
import { validarUsuarioEdicion } from "@/utilidades/validaciones";
import { Search, MoreVertical, Users, Shield, User, Loader2, Pencil, Trash2, Phone, AlertTriangle, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/componentes/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/componentes/ui/collapsible";
import { useNavigate } from "react-router-dom";

interface UserProfile {
  id: string; // profile id
  user_id: string; // auth user id
  full_name: string;
  email: string;
  student_code: string | null;
  phone: string | null;
  created_at: string;
  role: "admin" | "student";
  total_hours: number;
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filtros avanzados
  const [showFilters, setShowFilters] = useState(false);
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterCampus, setFilterCampus] = useState<string>("all");
  const [filterProgram, setFilterProgram] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "email" | "hours" | "created">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Edit State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", student_code: "", phone: "" });
  const [isSaving, setIsSaving] = useState(false);

  // Delete State
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();

    // Realtime subscription for updates
    const channel = supabase
      .channel('admin-users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchUsers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUsers = async () => {
    // Fetch profiles
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name");

    if (error) {
      console.error("Error fetching profiles:", error);
      setIsLoading(false);
      return;
    }

    // Fetch roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    // Fetch wellness hours
    const { data: hours } = await supabase
      .from("wellness_hours")
      .select("user_id, hours");

    const roleMap: Record<string, "admin" | "student"> = {};
    roles?.forEach((r) => {
      roleMap[r.user_id] = r.role as "admin" | "student";
    });

    const hoursMap: Record<string, number> = {};
    hours?.forEach((h) => {
      hoursMap[h.user_id] = (hoursMap[h.user_id] || 0) + Number(h.hours);
    });

    const usersWithRoles = profiles.map((p) => ({
      ...p,
      role: roleMap[p.user_id] || "student",
      total_hours: hoursMap[p.user_id] || 0,
    }));

    setUsers(usersWithRoles);
    setIsLoading(false);
  };

  const handleToggleRole = async (userProfile: UserProfile) => {
    if (currentUser?.id === userProfile.user_id) {
      toast({ title: "Acción no permitida", description: "No puedes cambiar tu propio rol.", variant: "destructive" });
      return;
    }

    if (!confirm(`¿Confirmas cambiar el rol de ${userProfile.full_name}?`)) return;

    const newRole = userProfile.role === "admin" ? "student" : "admin";

    // We strictly use upsert for role management to handle cases where no role exists yet
    const { error } = await supabase
      .from("user_roles")
      .upsert({ user_id: userProfile.user_id, role: newRole })
      .select();

    if (error) {
      toast({ title: "Error", description: "No se pudo cambiar el rol", variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: `Rol cambiado a ${newRole}` });
      // UI update is handled by realtime or manual set
      setUsers(users.map((u) =>
        u.user_id === userProfile.user_id ? { ...u, role: newRole } : u
      ));
    }
  };

  const handleEditClick = (user: UserProfile) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name || "",
      student_code: user.student_code || "",
      phone: user.phone || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    const validationError = validarUsuarioEdicion({
      nombreCompleto: editForm.full_name,
      codigoEstudiantil: editForm.student_code,
      celular: editForm.phone,
    });
    if (validationError) {
      toast({ title: "Error", description: validationError, variant: "destructive" });
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editForm.full_name,
        student_code: editForm.student_code || null,
        phone: editForm.phone || null
      })
      .eq("user_id", editingUser.user_id);

    if (error) {
      toast({ title: "Error", description: "Error al actualizar perfil", variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: "Perfil actualizado correctamente" });
      setIsEditDialogOpen(false);
      // Optimistic update
      setUsers(users.map(u => u.user_id === editingUser.user_id ? { ...u, ...editForm } : u));
    }
    setIsSaving(false);
  };

  const handleDeleteClick = (user: UserProfile) => {
    if (currentUser?.id === user.user_id) {
      toast({ title: "Acción no permitida", description: "No puedes eliminar tu propio usuario.", variant: "destructive" });
      return;
    }
    setUserToDelete(user);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    if (currentUser?.id === userToDelete.user_id) {
      toast({ title: "Acción no permitida", description: "No puedes eliminar tu propio usuario.", variant: "destructive" });
      setUserToDelete(null);
      return;
    }
    setIsDeleting(true);

    // Deleting from profiles. Requires RLS policy to allow deletion or admin role.
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("user_id", userToDelete.user_id);

    if (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudo eliminar el usuario. Puede tener registros relacionados.", variant: "destructive" });
    } else {
      toast({ title: "Eliminado", description: "Usuario eliminado correctamente" });
      setUsers(users.filter(u => u.user_id !== userToDelete.user_id));
    }
    setIsDeleting(false);
    setUserToDelete(null);
  };

  // Función de filtrado avanzado
  const applyFilters = (usersList: UserProfile[]) => {
    let filtered = usersList.filter((u) =>
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.student_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filtro por rol
    if (filterRole !== "all") {
      filtered = filtered.filter(u => u.role === filterRole);
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "name":
          comparison = a.full_name.localeCompare(b.full_name);
          break;
        case "email":
          comparison = a.email.localeCompare(b.email);
          break;
        case "hours":
          comparison = a.total_hours - b.total_hours;
          break;
        case "created":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return filtered;
  };

  const filteredUsers = applyFilters(users);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra roles y visualiza información de usuarios
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, email o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {filteredUsers.length} de {users.length} usuarios
          </div>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Filtro por Rol */}
                  <div className="space-y-2">
                    <Label>Rol</Label>
                    <Select value={filterRole} onValueChange={setFilterRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="student">Estudiante</SelectItem>
                      </SelectContent>
                    </Select>
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
                          <SelectItem value="name">Nombre</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="hours">Horas</SelectItem>
                          <SelectItem value="created">Fecha de creación</SelectItem>
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
                {(filterRole !== "all" || sortBy !== "name" || sortOrder !== "asc") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setFilterRole("all");
                      setSortBy("name");
                      setSortOrder("asc");
                    }}
                  >
                    Limpiar Filtros
                  </Button>
                )}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((userProfile) => (
                  <TableRow key={userProfile.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          {userProfile.role === "admin" ? (
                            <Shield className="h-4 w-4 text-primary" />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{userProfile.full_name}</p>
                          <p className="text-sm text-muted-foreground">{userProfile.email}</p>
                          {userProfile.phone && (
                            <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                              <Phone className="w-3 h-3 mr-1" />
                              {userProfile.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{userProfile.student_code || "-"}</TableCell>
                    <TableCell>
                      <span className="font-medium text-primary">
                        {userProfile.total_hours.toFixed(1)}h
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={userProfile.role === "admin" ? "default" : "secondary"}>
                        {userProfile.role === "admin" ? "Administrador" : "Estudiante"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEditClick(userProfile)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleRole(userProfile)}>
                            <Shield className="mr-2 h-4 w-4" />
                            {userProfile.role === "admin" ? "Quitar Admin" : "Hacer Admin"}
                          </DropdownMenuItem>
                          {userProfile.role === "student" && (
                            <DropdownMenuItem onClick={() => navigate(`/admin/sanctions?user=${userProfile.user_id}`)}>
                              <AlertTriangle className="mr-2 h-4 w-4" />
                              Crear Sanción
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(userProfile)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
              <DialogDescription>
                Modifica los datos del perfil de {editingUser?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fullname">Nombre Completo</Label>
                <Input
                  id="fullname"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Código Estudiantil</Label>
                <Input
                  id="code"
                  value={editForm.student_code}
                  onChange={(e) => setEditForm({ ...editForm, student_code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Celular</Label>
                <Input
                  id="phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente el perfil de <strong>{userToDelete?.full_name}</strong>.
                Si tiene préstamos o registros vinculados, podría causar errores o bloquearse.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
