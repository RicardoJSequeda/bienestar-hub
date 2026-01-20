import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SystemSettings {
  loan_timeout_minutes: number;
  pending_timeout_minutes: number;
  max_active_loans: number;
  max_loan_days: number;
  late_penalty_hours: number;
  damage_penalty_hours: number;
  lost_penalty_hours: number;
  auto_approve_low_risk: boolean;
  min_trust_score_auto_approve: number;
  enable_queue_system: boolean;
}

const defaultSettings: SystemSettings = {
  loan_timeout_minutes: 15,
  pending_timeout_minutes: 30,
  max_active_loans: 3,
  max_loan_days: 7,
  late_penalty_hours: -1,
  damage_penalty_hours: -5,
  lost_penalty_hours: -10,
  auto_approve_low_risk: true,
  min_trust_score_auto_approve: 80,
  enable_queue_system: true,
};

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("system_settings")
      .select("key, value");

    if (error) {
      console.error("Error fetching settings:", error);
      setIsLoading(false);
      return;
    }

    if (data) {
      const parsed: Record<string, any> = {};
      data.forEach((item) => {
        const key = item.key as keyof SystemSettings;
        const rawValue = typeof item.value === "string" ? item.value : JSON.stringify(item.value);
        
        // Parse based on expected type
        if (key === "auto_approve_low_risk" || key === "enable_queue_system") {
          parsed[key] = rawValue === "true" || rawValue === '"true"';
        } else {
          const numValue = parseFloat(rawValue.replace(/"/g, ""));
          parsed[key] = isNaN(numValue) ? defaultSettings[key] : numValue;
        }
      });

      setSettings({ ...defaultSettings, ...parsed });
    }
    setIsLoading(false);
  };

  const updateSetting = async (key: keyof SystemSettings, value: string | number | boolean) => {
    const { error } = await supabase
      .from("system_settings")
      .update({ value: JSON.stringify(value) })
      .eq("key", key);

    if (!error) {
      setSettings((prev) => ({ ...prev, [key]: value }));
    }

    return { error };
  };

  return { settings, isLoading, updateSetting, refetch: fetchSettings };
}
