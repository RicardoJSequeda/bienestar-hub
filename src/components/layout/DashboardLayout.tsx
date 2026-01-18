import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { FullPageLoading } from "@/components/ui/loading-spinner";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DashboardLayoutProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/resources": "Catálogo de Recursos",
  "/my-loans": "Mis Préstamos",
  "/events": "Eventos",
  "/my-hours": "Mis Horas de Bienestar",
  "/admin/resources": "Gestión de Recursos",
  "/admin/loans": "Gestión de Préstamos",
  "/admin/events": "Gestión de Eventos",
  "/admin/users": "Gestión de Usuarios",
  "/admin/reports": "Reportes",
  "/admin/settings": "Configuración",
};

export function DashboardLayout({ children, requireAdmin = false }: DashboardLayoutProps) {
  const { user, isAdmin, isLoading, profile } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullPageLoading />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const currentTitle = pageTitles[location.pathname] || "Dashboard";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          {/* Header */}
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            <SidebarTrigger className="-ml-2" />
            
            {/* Page Title */}
            <div className="flex-1">
              <h2 className="text-lg font-semibold hidden md:block">{currentTitle}</h2>
            </div>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="pl-9 h-9 bg-muted/50 border-0 focus-visible:bg-background"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                  3
                </span>
              </Button>
              <ThemeToggle />
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="container max-w-7xl py-6 px-6 animate-fade-in">
              {children}
            </div>
          </main>

          {/* Footer */}
          <footer className="border-t py-4 px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
              <p>© {new Date().getFullYear()} Bienestar Universitario</p>
              <p className="text-xs">
                Conectado como <span className="font-medium text-foreground">{profile?.full_name}</span>
              </p>
            </div>
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}