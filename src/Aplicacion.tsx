import { Toaster } from "@/componentes/ui/toaster";
import { Toaster as Sonner } from "@/componentes/ui/sonner";
import { TooltipProvider } from "@/componentes/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contextos/ContextoAutenticacion";
import Auth from "./paginas/Autenticacion";
import SetPassword from "./paginas/EstablecerContrasena";
import Dashboard from "./paginas/Tablero";
import Profile from "./paginas/Perfil";
import NotFound from "./paginas/NoEncontrado";
import { OfflineStatus } from "@/componentes/pwa/EstadoSinConexion";

// Student pages
import StudentResources from "./paginas/estudiante/Recursos";
import MyLoans from "./paginas/estudiante/MisPrestamos";
import StudentEvents from "./paginas/estudiante/Eventos";
import EventDetails from "./paginas/estudiante/DetalleEvento";
import MyHours from "./paginas/estudiante/MisHoras";
import MySanctions from "./paginas/estudiante/MisSanciones";
import CalendarEvents from "./paginas/estudiante/CalendarioEventos";
import NotificationsPage from "./paginas/Notificaciones";

// Admin pages
import AdminResources from "./paginas/Recursos";
import AdminLoans from "./paginas/Prestamos";
import AdminEvents from "./paginas/Eventos";
import AdminUsers from "./paginas/Usuarios";
import AdminReports from "./paginas/Reportes";
import AdminSettings from "./paginas/Configuracion";
import AdminSanctions from "./paginas/Sanciones";
import AdminPolicies from "./paginas/Politicas";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <OfflineStatus />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            {/* Student routes */}
            <Route path="/resources" element={<StudentResources />} />
            <Route path="/my-loans" element={<MyLoans />} />
            <Route path="/events" element={<StudentEvents />} />
            <Route path="/events/:id" element={<EventDetails />} />
            <Route path="/events/calendar" element={<CalendarEvents />} />
            <Route path="/my-hours" element={<MyHours />} />
            <Route path="/my-sanctions" element={<MySanctions />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            {/* Admin routes */}
            <Route path="/admin/resources" element={<AdminResources />} />
            <Route path="/admin/loans" element={<AdminLoans />} />
            <Route path="/admin/events" element={<AdminEvents />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/sanctions" element={<AdminSanctions />} />
            <Route path="/admin/policies" element={<AdminPolicies />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
