import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Student pages
import StudentResources from "./pages/student/Resources";
import MyLoans from "./pages/student/MyLoans";
import StudentEvents from "./pages/student/Events";
import MyHours from "./pages/student/MyHours";

// Admin pages
import AdminResources from "./pages/admin/Resources";
import AdminLoans from "./pages/admin/Loans";
import AdminEvents from "./pages/admin/Events";
import AdminUsers from "./pages/admin/Users";
import AdminReports from "./pages/admin/Reports";
import AdminSettings from "./pages/admin/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            {/* Student routes */}
            <Route path="/resources" element={<StudentResources />} />
            <Route path="/my-loans" element={<MyLoans />} />
            <Route path="/events" element={<StudentEvents />} />
            <Route path="/my-hours" element={<MyHours />} />
            {/* Admin routes */}
            <Route path="/admin/resources" element={<AdminResources />} />
            <Route path="/admin/loans" element={<AdminLoans />} />
            <Route path="/admin/events" element={<AdminEvents />} />
            <Route path="/admin/users" element={<AdminUsers />} />
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
