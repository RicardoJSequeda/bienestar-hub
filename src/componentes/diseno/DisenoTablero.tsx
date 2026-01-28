import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contextos/ContextoAutenticacion";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/componentes/ui/sidebar";
import { AppSidebar } from "./BarraLateralApp";
import { MobileBottomNav } from "./NavegacionInferiorMovil";
import { ThemeToggle } from "@/componentes/ui/theme-toggle";
import { FullPageLoading } from "@/componentes/ui/loading-spinner";
import { Bell, Search, ChevronLeft } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { useIsMobile } from "@/ganchos/usar-movil";
import { NotificationBell } from "./CampanaNotificaciones";

interface DashboardLayoutProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/resources": "Recursos",
  "/my-loans": "Mis Préstamos",
  "/events": "Eventos",
  "/my-hours": "Mis Horas",
  "/admin/resources": "Recursos",
  "/admin/loans": "Préstamos",
  "/admin/events": "Eventos",
  "/admin/users": "Usuarios",
  "/admin/reports": "Reportes",
  "/admin/settings": "Configuración",
};

export function DashboardLayout({ children, requireAdmin = false }: DashboardLayoutProps) {
  const { user, isAdmin, isLoading, profile } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();

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
  const showBackButton = location.pathname !== "/dashboard";

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 safe-area-inset-top">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 -ml-1"
              onClick={() => window.history.back()}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}

          <h1 className="flex-1 text-lg font-semibold truncate">{currentTitle}</h1>

          <div className="flex items-center gap-1">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20 scroll-smooth-touch touch-auto">
          <div className="p-4 animate-fade-in">
            {children}
          </div>
        </main>

        {/* Bottom Navigation */}
        <MobileBottomNav />
      </div>
    );
  }

  // Desktop Layout
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
              <h2 className="text-lg font-semibold">{currentTitle}</h2>
            </div>

            {/* Search Bar - Desktop */}
            <div className="hidden lg:flex relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="pl-9 h-9 bg-muted/50 border-0 focus-visible:bg-background"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <NotificationBell />
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
