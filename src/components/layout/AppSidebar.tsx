import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
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
  GraduationCap,
} from "lucide-react";

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

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
            <GraduationCap className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">
              Bienestar
            </span>
            <span className="text-xs text-sidebar-foreground/70">
              Universitario
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            {isAdmin ? "Administración" : "Navegación"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    isActive={location.pathname === item.path}
                    className="w-full"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="mb-3">
          <p className="text-sm font-medium text-sidebar-foreground truncate">
            {profile?.full_name || "Usuario"}
          </p>
          <p className="text-xs text-sidebar-foreground/60 truncate">
            {profile?.email}
          </p>
          <span className="inline-flex items-center rounded-full bg-sidebar-accent px-2 py-0.5 text-xs font-medium text-sidebar-accent-foreground mt-1">
            {isAdmin ? "Administrador" : "Estudiante"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
