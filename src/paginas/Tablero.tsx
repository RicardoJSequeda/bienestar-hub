import { useAuth } from "@/contextos/ContextoAutenticacion";
import { DashboardLayout } from "@/componentes/diseno/DisenoTablero";
import { StudentDashboard } from "@/componentes/tablero/TableroEstudiante";
import { AdminDashboard } from "@/componentes/tablero/TableroAdmin";

export default function Dashboard() {
  const { isAdmin } = useAuth();

  return (
    <DashboardLayout>
      {isAdmin ? <AdminDashboard /> : <StudentDashboard />}
    </DashboardLayout>
  );
}
