import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contextos/ContextoAutenticacion";
import { cn } from "@/utilidades/utilidades";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Calendar,
  Clock,
  Users,
  BarChart3,
  Settings,
  Menu,
  ShieldAlert,
  FileText,
  Download,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/componentes/ui/sheet";
import { Button } from "@/componentes/ui/button";
import { Avatar, AvatarFallback } from "@/componentes/ui/avatar";
import { Badge } from "@/componentes/ui/badge";

const studentNavItems = [
  { title: "Inicio", icon: LayoutDashboard, path: "/dashboard" },
  { title: "Recursos", icon: Package, path: "/resources" },
  { title: "Préstamos", icon: ClipboardList, path: "/my-loans" },
  { title: "Eventos", icon: Calendar, path: "/events" },
  { title: "Más", icon: Menu, path: "more" },
];

const studentMoreItems = [
  { title: "Mi Perfil", icon: Settings, path: "/profile" },
  { title: "Mis Horas", icon: Clock, path: "/my-hours" },
  { title: "Mis Sanciones", icon: ShieldAlert, path: "/my-sanctions" },
];

const adminNavItems = [
  { title: "Inicio", icon: LayoutDashboard, path: "/dashboard" },
  { title: "Recursos", icon: Package, path: "/admin/resources" },
  { title: "Préstamos", icon: ClipboardList, path: "/admin/loans" },
  { title: "Eventos", icon: Calendar, path: "/admin/events" },
  { title: "Más", icon: Menu, path: "more" },
];

const adminMoreItems = [
  { title: "Mi Perfil", icon: Settings, path: "/profile" },
  { title: "Usuarios", icon: Users, path: "/admin/users" },
  { title: "Sanciones", icon: ShieldAlert, path: "/admin/sanctions" },
  { title: "Políticas", icon: FileText, path: "/admin/policies" },
  { title: "Reportes", icon: BarChart3, path: "/admin/reports" },
  { title: "Configuración", icon: Settings, path: "/admin/settings" },
];

export function MobileBottomNav() {
  const { isAdmin, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if installed
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes("android-app://");
      setIsStandalone(isStandaloneMode);
    };
    checkStandalone();

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Native prompt available (Android/Desktop usually)
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response: ${outcome}`);
      setDeferredPrompt(null);
      setIsMoreOpen(false);
    }
  };

  const navItems = isAdmin ? adminNavItems : studentNavItems;
  const moreItems = isAdmin ? adminMoreItems : studentMoreItems;

  const handleNavClick = (path: string) => {
    if (path === "more") {
      setIsMoreOpen(true);
    } else {
      navigate(path);
    }
  };

  const isActive = (path: string) => {
    if (path === "more") {
      return moreItems.some(item => location.pathname === item.path);
    }
    return location.pathname === path;
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-xl border-t border-border safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-0.5 touch-target active-scale",
                  "transition-colors duration-200",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-7 rounded-full transition-colors",
                  active && "bg-primary/10"
                )}>
                  <item.icon className={cn(
                    "h-5 w-5 transition-all",
                    active && "scale-110"
                  )} />
                </div>
                <span className={cn(
                  "text-[10px] font-medium",
                  active && "font-semibold"
                )}>
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* More Sheet */}
      <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-left">Menú</SheetTitle>
          </SheetHeader>

          {/* User info */}
          <div
            className="flex items-center gap-3 p-3 mb-4 rounded-xl bg-muted/50 active:bg-muted transition-colors cursor-pointer"
            onClick={() => {
              navigate("/profile");
              setIsMoreOpen(false);
            }}
          >
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {getInitials(profile?.full_name || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{profile?.full_name}</p>
              <p className="text-sm text-muted-foreground truncate">{profile?.email}</p>
            </div>
            <Badge variant={isAdmin ? "default" : "secondary"}>
              {isAdmin ? "Admin" : "Estudiante"}
            </Badge>
          </div>

          {/* PWA Install Button - Only show if native prompt is captured (Android/Chrome) */}
          {!isStandalone && deferredPrompt && (
            <div className="mb-4">
              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg font-bold"
                onClick={handleInstallClick}
              >
                <Download className="mr-2 h-5 w-5" />
                Instalar Aplicación
              </Button>
            </div>
          )}


          {/* More menu items */}
          <div className="space-y-1">
            {moreItems.map((item) => (
              <Button
                key={item.path}
                variant={location.pathname === item.path ? "secondary" : "ghost"}
                className="w-full justify-start h-12"
                onClick={() => {
                  navigate(item.path);
                  setIsMoreOpen(false);
                }}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.title}
              </Button>
            ))}
          </div>

          {/* Sign out */}
          <div className="pt-4 mt-4 border-t pb-8">
            <Button
              variant="ghost"
              className="w-full justify-start h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={async () => {
                await signOut();
                navigate("/auth");
              }}
            >
              Cerrar Sesión
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
