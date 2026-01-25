import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contextos/ContextoAutenticacion";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/componentes/ui/sidebar";
import { Button } from "@/componentes/ui/button";
import { Avatar, AvatarFallback } from "@/componentes/ui/avatar";
import { Badge } from "@/componentes/ui/badge";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Calendar,
  Clock,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/utilidades/utilidades";

const studentMenuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { title: "Recursos", icon: Package, path: "/resources" },
  { title: "Mis Préstamos", icon: ClipboardList, path: "/my-loans" },
  { title: "Eventos", icon: Calendar, path: "/events" },
  { title: "Mis Horas", icon: Clock, path: "/my-hours" },
];

const adminMenuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { title: "Recursos", icon: Package, path: "/admin/resources" },
  { title: "Préstamos", icon: ClipboardList, path: "/admin/loans" },
  { title: "Eventos", icon: Calendar, path: "/admin/events" },
  { title: "Usuarios", icon: Users, path: "/admin/users" },
  { title: "Reportes", icon: BarChart3, path: "/admin/reports" },
  { title: "Configuración", icon: Settings, path: "/admin/settings" },
];

export function AppSidebar() {
  const { profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = isAdmin ? adminMenuItems : studentMenuItems;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-5">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Universidad Cooperativa de Colombia"
            className="h-11 w-11 object-contain"
          />
          <div className="flex flex-col">
            <span className="text-base font-bold text-sidebar-foreground tracking-tight">
              Bienestar UCC
            </span>
            <span className="text-xs text-sidebar-foreground/60 font-medium">
              Universidad Cooperativa
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40 mb-2">
            {isAdmin ? "Administración" : "Menú Principal"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "w-full h-11 rounded-lg transition-all duration-200",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        isActive && "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                      )}
                    >
                      <item.icon className={cn(
                        "h-5 w-5 transition-colors",
                        isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/70"
                      )} />
                      <span className="font-medium">{item.title}</span>
                      {isActive && (
                        <ChevronRight className="ml-auto h-4 w-4 opacity-70" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border/50">
        {/* User Card */}
        <div className="rounded-xl bg-sidebar-accent/50 p-3 mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-sidebar-primary/30">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-semibold text-sm">
                {getInitials(profile?.full_name || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">
                {profile?.full_name || "Usuario"}
              </p>
              <p className="text-xs text-sidebar-foreground/50 truncate">
                {profile?.email}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-medium border-0",
                isAdmin
                  ? "bg-accent/20 text-accent"
                  : "bg-sidebar-primary/20 text-sidebar-primary"
              )}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {isAdmin ? "Administrador" : "Estudiante"}
            </Badge>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/profile")}
          className="w-full justify-start h-10 mb-1 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Settings className="mr-2 h-4 w-4" />
          Mi Perfil
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start h-10 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}