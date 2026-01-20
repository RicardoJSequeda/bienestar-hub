import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StudentScore {
  id: string;
  user_id: string;
  trust_score: number;
  total_loans: number;
  on_time_returns: number;
  late_returns: number;
  damages: number;
  losses: number;
  events_attended: number;
  is_blocked: boolean;
  blocked_until: string | null;
  blocked_reason: string | null;
}

export function useStudentScore(userId?: string) {
  const [score, setScore] = useState<StudentScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchScore(userId);
    } else {
      setIsLoading(false);
    }
  }, [userId]);

  const fetchScore = async (uid: string) => {
    const { data, error } = await supabase
      .from("student_scores")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();

    if (error) {
      console.error("Error fetching score:", error);
    } else {
      setScore(data);
    }
    setIsLoading(false);
  };

  const calculateScore = async (uid: string) => {
    const { data, error } = await supabase.rpc("calculate_trust_score", {
      p_user_id: uid,
    });

    if (!error && data) {
      await fetchScore(uid);
    }

    return { score: data, error };
  };

  const getScoreLevel = (trustScore: number) => {
    if (trustScore >= 150) return { level: "excellent", label: "Excelente", color: "text-success" };
    if (trustScore >= 100) return { level: "good", label: "Bueno", color: "text-primary" };
    if (trustScore >= 70) return { level: "regular", label: "Regular", color: "text-yellow-600" };
    return { level: "low", label: "Bajo", color: "text-destructive" };
  };

  return { 
    score, 
    isLoading, 
    calculateScore, 
    getScoreLevel,
    refetch: () => userId && fetchScore(userId) 
  };
}
