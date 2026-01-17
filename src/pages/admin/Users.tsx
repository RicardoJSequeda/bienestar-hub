import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { Search, MoreVertical, Users, Shield, User, Loader2 } from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  student_code: string | null;
  major: string | null;
  created_at: string;
  role: "admin" | "student";
  total_hours: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchUsers();
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
    const newRole = userProfile.role === "admin" ? "student" : "admin";
    
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", userProfile.user_id);

    if (error) {
      toast({ title: "Error", description: "No se pudo cambiar el rol", variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: `Rol cambiado a ${newRole}` });
      setUsers(users.map((u) =>
        u.user_id === userProfile.user_id ? { ...u, role: newRole } : u
      ));
    }
  };

  const filteredUsers = users.filter((u) =>
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.student_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const admins = filteredUsers.filter((u) => u.role === "admin");
  const students = filteredUsers.filter((u) => u.role === "student");

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
            {users.length} usuarios
          </div>
        </div>

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
                  <TableHead>Carrera</TableHead>
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
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{userProfile.student_code || "-"}</TableCell>
                    <TableCell>{userProfile.major || "-"}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleToggleRole(userProfile)}>
                            <Shield className="mr-2 h-4 w-4" />
                            {userProfile.role === "admin" ? "Quitar rol admin" : "Hacer administrador"}
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
      </div>
    </DashboardLayout>
  );
}
