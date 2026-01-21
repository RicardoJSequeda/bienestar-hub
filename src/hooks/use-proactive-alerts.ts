import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AlertData {
  type: string;
  title: string;
  message?: string;
  severity: "info" | "warning" | "error";
  entity_type?: string;
  entity_id?: string;
  target_role?: "admin" | "student";
  target_user_id?: string;
}

export function useProactiveAlerts() {
  const createAlert = useCallback(async (data: AlertData) => {
    const { error } = await supabase.from("alerts").insert({
      type: data.type,
      title: data.title,
      message: data.message || null,
      severity: data.severity,
      entity_type: data.entity_type || null,
      entity_id: data.entity_id || null,
      target_role: data.target_role || null,
      target_user_id: data.target_user_id || null,
    });

    if (error) {
      console.error("Error creating alert:", error);
    }

    return !error;
  }, []);

  const checkOverdueLoans = useCallback(async () => {
    const { data: overdueLoans } = await supabase
      .from("loans")
      .select(`
        id,
        due_date,
        user_id,
        profiles:user_id(full_name),
        resources:resource_id(name)
      `)
      .eq("status", "active")
      .lt("due_date", new Date().toISOString());

    if (overdueLoans && overdueLoans.length > 0) {
      for (const loan of overdueLoans) {
        // Check if alert already exists
        const { data: existingAlert } = await supabase
          .from("alerts")
          .select("id")
          .eq("entity_type", "loan")
          .eq("entity_id", loan.id)
          .eq("type", "overdue_loan")
          .single();

        if (!existingAlert) {
          await createAlert({
            type: "overdue_loan",
            title: "Préstamo vencido",
            message: `${(loan.profiles as any)?.full_name} tiene un préstamo vencido de ${(loan.resources as any)?.name}`,
            severity: "warning",
            entity_type: "loan",
            entity_id: loan.id,
            target_role: "admin",
          });
        }
      }
    }

    return overdueLoans?.length || 0;
  }, [createAlert]);

  const checkHighDemandResources = useCallback(async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: loans } = await supabase
      .from("loans")
      .select("resource_id, resources:resource_id(name)")
      .gte("requested_at", thirtyDaysAgo.toISOString());

    if (loans) {
      const resourceCounts: Record<string, { count: number; name: string }> = {};
      
      for (const loan of loans) {
        if (!resourceCounts[loan.resource_id]) {
          resourceCounts[loan.resource_id] = {
            count: 0,
            name: (loan.resources as any)?.name || "Recurso",
          };
        }
        resourceCounts[loan.resource_id].count++;
      }

      // Alert for resources with high demand (more than 20 loans in 30 days)
      for (const [resourceId, data] of Object.entries(resourceCounts)) {
        if (data.count >= 20) {
          const { data: existingAlert } = await supabase
            .from("alerts")
            .select("id")
            .eq("entity_type", "resource")
            .eq("entity_id", resourceId)
            .eq("type", "high_demand")
            .gte("created_at", thirtyDaysAgo.toISOString())
            .single();

          if (!existingAlert) {
            await createAlert({
              type: "high_demand",
              title: "Recurso con alta demanda",
              message: `${data.name} ha sido solicitado ${data.count} veces en los últimos 30 días`,
              severity: "info",
              entity_type: "resource",
              entity_id: resourceId,
              target_role: "admin",
            });
          }
        }
      }
    }
  }, [createAlert]);

  const checkBlockedStudents = useCallback(async () => {
    const { data: blockedStudents } = await supabase
      .from("student_scores")
      .select(`
        id,
        user_id,
        blocked_reason,
        profiles:user_id(full_name)
      `)
      .eq("is_blocked", true);

    if (blockedStudents && blockedStudents.length > 0) {
      for (const student of blockedStudents) {
        const { data: existingAlert } = await supabase
          .from("alerts")
          .select("id")
          .eq("entity_type", "student")
          .eq("entity_id", student.user_id)
          .eq("type", "blocked_user")
          .single();

        if (!existingAlert) {
          await createAlert({
            type: "blocked_user",
            title: "Estudiante bloqueado",
            message: `${(student as any).profiles?.full_name || "Estudiante"} ha sido bloqueado: ${student.blocked_reason || "Sin razón especificada"}`,
            severity: "warning",
            entity_type: "student",
            entity_id: student.user_id,
            target_role: "admin",
          });
        }
      }
    }
  }, [createAlert]);

  const checkResourceMaintenance = useCallback(async () => {
    const { data: maintenanceResources } = await supabase
      .from("resources")
      .select("id, name")
      .eq("status", "maintenance");

    if (maintenanceResources && maintenanceResources.length > 0) {
      for (const resource of maintenanceResources) {
        const { data: existingAlert } = await supabase
          .from("alerts")
          .select("id")
          .eq("entity_type", "resource")
          .eq("entity_id", resource.id)
          .eq("type", "resource_issue")
          .single();

        if (!existingAlert) {
          await createAlert({
            type: "resource_issue",
            title: "Recurso en mantenimiento",
            message: `${resource.name} está marcado como en mantenimiento`,
            severity: "info",
            entity_type: "resource",
            entity_id: resource.id,
            target_role: "admin",
          });
        }
      }
    }
  }, [createAlert]);

  const runAllChecks = useCallback(async () => {
    await Promise.all([
      checkOverdueLoans(),
      checkHighDemandResources(),
      checkBlockedStudents(),
      checkResourceMaintenance(),
    ]);
  }, [checkOverdueLoans, checkHighDemandResources, checkBlockedStudents, checkResourceMaintenance]);

  return {
    createAlert,
    checkOverdueLoans,
    checkHighDemandResources,
    checkBlockedStudents,
    checkResourceMaintenance,
    runAllChecks,
  };
}
