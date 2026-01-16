import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";

export default function Dashboard() {
  const { isAdmin } = useAuth();

  return (
    <DashboardLayout>
      {isAdmin ? <AdminDashboard /> : <StudentDashboard />}
    </DashboardLayout>
  );
}
