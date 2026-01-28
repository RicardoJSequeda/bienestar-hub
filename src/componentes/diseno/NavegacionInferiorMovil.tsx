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
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/componentes/ui/sheet";
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
  { title: "Reportes", icon: BarChart3, path: "/admin/reports" },
  { title: "Configuración", icon: Settings, path: "/admin/settings" },
];

export function MobileBottomNav() {
  const { isAdmin, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

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
@@ -99,77 +101,83 @@
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
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-left">Menú</SheetTitle>
          </SheetHeader>
          

          {/* User info */}
          <div className="flex items-center gap-3 p-3 mb-4 rounded-xl bg-muted/50">
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
          <div className="pt-4 mt-4 border-t">
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
