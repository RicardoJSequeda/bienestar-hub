-- ============================================
-- 1. NUEVOS ESTADOS PARA RECURSOS Y PRÉSTAMOS
-- ============================================

-- Actualizar enum de estado de recurso
ALTER TYPE resource_status ADD VALUE IF NOT EXISTS 'reserved';
ALTER TYPE resource_status ADD VALUE IF NOT EXISTS 'maintenance';
ALTER TYPE resource_status ADD VALUE IF NOT EXISTS 'retired';

-- Actualizar enum de estado de préstamo
ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'active';
ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'overdue';
ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'lost';
ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'damaged';
ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'queued';

-- ============================================
-- 2. TABLA DE CONFIGURACIÓN DEL SISTEMA
-- ============================================

CREATE TABLE IF NOT EXISTS public.system_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text UNIQUE NOT NULL,
    value jsonb NOT NULL DEFAULT '{}',
    category text NOT NULL DEFAULT 'general',
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view settings" ON public.system_settings
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage settings" ON public.system_settings
    FOR ALL USING (is_admin());

-- Insertar configuraciones iniciales
INSERT INTO public.system_settings (key, value, category, description) VALUES
('loan_timeout_minutes', '15', 'loans', 'Tiempo máximo para retirar un préstamo aprobado'),
('pending_timeout_minutes', '30', 'loans', 'Tiempo máximo para aprobar una solicitud pendiente'),
('max_active_loans', '3', 'loans', 'Préstamos activos máximos por estudiante'),
('max_loan_days', '7', 'loans', 'Días máximos de préstamo por defecto'),
('late_penalty_hours', '-1', 'penalties', 'Horas de penalización por devolución tardía'),
('damage_penalty_hours', '-5', 'penalties', 'Horas de penalización por daño'),
('lost_penalty_hours', '-10', 'penalties', 'Horas de penalización por pérdida'),
('auto_approve_low_risk', 'true', 'automation', 'Aprobar automáticamente recursos de bajo riesgo'),
('min_trust_score_auto_approve', '80', 'automation', 'Score mínimo para auto-aprobación'),
('enable_queue_system', 'true', 'automation', 'Habilitar cola de espera para recursos ocupados')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 3. SCORE DE CONFIANZA DEL ESTUDIANTE
-- ============================================

CREATE TABLE IF NOT EXISTS public.student_scores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    trust_score integer NOT NULL DEFAULT 100,
    total_loans integer NOT NULL DEFAULT 0,
    on_time_returns integer NOT NULL DEFAULT 0,
    late_returns integer NOT NULL DEFAULT 0,
    damages integer NOT NULL DEFAULT 0,
    losses integer NOT NULL DEFAULT 0,
    events_attended integer NOT NULL DEFAULT 0,
    is_blocked boolean NOT NULL DEFAULT false,
    blocked_until timestamptz,
    blocked_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own score" ON public.student_scores
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all scores" ON public.student_scores
    FOR SELECT USING (is_admin());

CREATE POLICY "Only admins can manage scores" ON public.student_scores
    FOR ALL USING (is_admin());

-- ============================================
-- 4. REGLAS POR CATEGORÍA
-- ============================================

ALTER TABLE public.resource_categories 
ADD COLUMN IF NOT EXISTS max_loan_days integer DEFAULT 7,
ADD COLUMN IF NOT EXISTS is_low_risk boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS requires_approval boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS max_per_student integer DEFAULT 1;

-- ============================================
-- 5. CAMPOS ADICIONALES EN PRÉSTAMOS
-- ============================================

ALTER TABLE public.loans
ADD COLUMN IF NOT EXISTS pickup_deadline timestamptz,
ADD COLUMN IF NOT EXISTS created_by_admin boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS damage_notes text,
ADD COLUMN IF NOT EXISTS damage_evidence_url text,
ADD COLUMN IF NOT EXISTS queue_position integer,
ADD COLUMN IF NOT EXISTS auto_approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS trust_score_at_request integer;

-- ============================================
-- 6. COLA DE ESPERA PARA RECURSOS
-- ============================================

CREATE TABLE IF NOT EXISTS public.resource_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id uuid NOT NULL,
    user_id uuid NOT NULL,
    position integer NOT NULL,
    requested_at timestamptz NOT NULL DEFAULT now(),
    notified_at timestamptz,
    expires_at timestamptz,
    status text NOT NULL DEFAULT 'waiting',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(resource_id, user_id)
);

ALTER TABLE public.resource_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their queue position" ON public.resource_queue
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage queue" ON public.resource_queue
    FOR ALL USING (is_admin());

CREATE POLICY "Users can join queue" ON public.resource_queue
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave queue" ON public.resource_queue
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 7. HISTORIAL DE AUDITORÍA
-- ============================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    old_data jsonb,
    new_data jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (is_admin());

CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- ============================================
-- 8. ALERTAS Y NOTIFICACIONES
-- ============================================

CREATE TABLE IF NOT EXISTS public.alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL,
    severity text NOT NULL DEFAULT 'info',
    title text NOT NULL,
    message text,
    entity_type text,
    entity_id uuid,
    is_read boolean NOT NULL DEFAULT false,
    target_role app_role,
    target_user_id uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin alerts" ON public.alerts
    FOR SELECT USING (is_admin() AND (target_role = 'admin' OR target_role IS NULL));

CREATE POLICY "Users can view their own alerts" ON public.alerts
    FOR SELECT USING (auth.uid() = target_user_id);

CREATE POLICY "Only admins can manage alerts" ON public.alerts
    FOR ALL USING (is_admin());

-- ============================================
-- 9. ESTADÍSTICAS DE DEMANDA (para predicción)
-- ============================================

CREATE TABLE IF NOT EXISTS public.demand_stats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id uuid,
    category_id uuid,
    day_of_week integer,
    hour_of_day integer,
    request_count integer NOT NULL DEFAULT 0,
    approval_rate numeric DEFAULT 0,
    avg_loan_duration_hours numeric DEFAULT 0,
    period_start date NOT NULL,
    period_end date NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demand_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view demand stats" ON public.demand_stats
    FOR SELECT USING (is_admin());

CREATE POLICY "Only admins can manage demand stats" ON public.demand_stats
    FOR ALL USING (is_admin());

-- ============================================
-- 10. FUNCIÓN PARA CALCULAR TRUST SCORE
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_trust_score(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_score integer := 100;
    v_stats record;
BEGIN
    SELECT 
        COUNT(*) FILTER (WHERE status = 'returned') as total_returns,
        COUNT(*) FILTER (WHERE status = 'returned' AND returned_at <= due_date) as on_time,
        COUNT(*) FILTER (WHERE status = 'returned' AND returned_at > due_date) as late,
        COUNT(*) FILTER (WHERE status = 'lost') as lost,
        COUNT(*) FILTER (WHERE status = 'damaged') as damaged
    INTO v_stats
    FROM loans
    WHERE user_id = p_user_id;
    
    -- Calcular score
    v_score := 100;
    v_score := v_score + (v_stats.on_time * 2);  -- +2 por devolución a tiempo
    v_score := v_score - (v_stats.late * 5);      -- -5 por retraso
    v_score := v_score - (v_stats.lost * 20);     -- -20 por pérdida
    v_score := v_score - (v_stats.damaged * 10);  -- -10 por daño
    
    -- Limitar entre 0 y 200
    v_score := GREATEST(0, LEAST(200, v_score));
    
    -- Actualizar tabla de scores
    INSERT INTO student_scores (user_id, trust_score, total_loans, on_time_returns, late_returns, damages, losses)
    VALUES (p_user_id, v_score, v_stats.total_returns, v_stats.on_time, v_stats.late, v_stats.damaged, v_stats.lost)
    ON CONFLICT (user_id) DO UPDATE SET
        trust_score = v_score,
        total_loans = v_stats.total_returns,
        on_time_returns = v_stats.on_time,
        late_returns = v_stats.late,
        damages = v_stats.damaged,
        losses = v_stats.lost,
        updated_at = now();
    
    RETURN v_score;
END;
$$;

-- ============================================
-- 11. FUNCIÓN PARA VERIFICAR AUTO-APROBACIÓN
-- ============================================

CREATE OR REPLACE FUNCTION public.can_auto_approve(p_user_id uuid, p_resource_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_auto_approve boolean;
    v_min_score integer;
    v_user_score integer;
    v_is_low_risk boolean;
    v_is_blocked boolean;
    v_active_loans integer;
    v_max_loans integer;
BEGIN
    -- Obtener configuración
    SELECT (value::text)::boolean INTO v_auto_approve 
    FROM system_settings WHERE key = 'auto_approve_low_risk';
    
    IF NOT v_auto_approve THEN
        RETURN false;
    END IF;
    
    SELECT (value::text)::integer INTO v_min_score 
    FROM system_settings WHERE key = 'min_trust_score_auto_approve';
    
    SELECT (value::text)::integer INTO v_max_loans 
    FROM system_settings WHERE key = 'max_active_loans';
    
    -- Verificar score del usuario
    SELECT trust_score, is_blocked INTO v_user_score, v_is_blocked
    FROM student_scores WHERE user_id = p_user_id;
    
    IF v_is_blocked OR COALESCE(v_user_score, 100) < v_min_score THEN
        RETURN false;
    END IF;
    
    -- Verificar préstamos activos
    SELECT COUNT(*) INTO v_active_loans
    FROM loans 
    WHERE user_id = p_user_id AND status IN ('pending', 'approved', 'active');
    
    IF v_active_loans >= v_max_loans THEN
        RETURN false;
    END IF;
    
    -- Verificar si el recurso es de bajo riesgo
    SELECT rc.is_low_risk INTO v_is_low_risk
    FROM resources r
    JOIN resource_categories rc ON r.category_id = rc.id
    WHERE r.id = p_resource_id;
    
    RETURN COALESCE(v_is_low_risk, false);
END;
$$;

-- ============================================
-- 12. TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA
-- ============================================

CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_scores_updated_at
    BEFORE UPDATE ON public.student_scores
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();