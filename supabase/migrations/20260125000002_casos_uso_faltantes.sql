-- ============================================================================
-- MIGRACIÓN: Casos de Uso Faltantes - Infraestructura SQL
-- ============================================================================
-- Descripción: Crea tablas y funciones necesarias para casos de uso faltantes
-- Fecha: 2026-01-25
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. GESTIÓN DE DAÑOS Y PÉRDIDAS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resource_damages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
    resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    damage_type TEXT NOT NULL, -- 'damage', 'loss', 'theft'
    severity TEXT DEFAULT 'minor', -- 'minor', 'moderate', 'severe', 'total_loss'
    description TEXT NOT NULL,
    damage_images TEXT[], -- Array de URLs de imágenes
    estimated_cost NUMERIC(10,2),
    fine_amount NUMERIC(10,2),
    fine_paid BOOLEAN DEFAULT false,
    fine_paid_at TIMESTAMPTZ,
    reported_by UUID REFERENCES auth.users(id) NOT NULL,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'fine_issued', 'resolved'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_damages_loan_id ON public.resource_damages(loan_id);
CREATE INDEX IF NOT EXISTS idx_damages_resource_id ON public.resource_damages(resource_id);
CREATE INDEX IF NOT EXISTS idx_damages_user_id ON public.resource_damages(user_id);
CREATE INDEX IF NOT EXISTS idx_damages_status ON public.resource_damages(status);

-- ----------------------------------------------------------------------------
-- 2. HISTORIAL DE MOVIMIENTOS DE RECURSOS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resource_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE NOT NULL,
    loan_id UUID REFERENCES public.loans(id) ON DELETE SET NULL,
    movement_type TEXT NOT NULL, -- 'loan_start', 'loan_end', 'maintenance_start', 'maintenance_end', 'status_change'
    from_status TEXT,
    to_status TEXT,
    from_location TEXT, -- Campus o ubicación
    to_location TEXT,
    performed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movements_resource_id ON public.resource_movements(resource_id);
CREATE INDEX IF NOT EXISTS idx_movements_loan_id ON public.resource_movements(loan_id);
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON public.resource_movements(created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. MANTENIMIENTO PROGRAMADO DE RECURSOS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resource_maintenance_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE NOT NULL,
    maintenance_type TEXT NOT NULL, -- 'preventive', 'corrective', 'inspection'
    frequency_days INTEGER, -- Cada cuántos días
    last_maintenance_date TIMESTAMPTZ,
    next_maintenance_date TIMESTAMPTZ NOT NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_resource_id ON public.resource_maintenance_schedule(resource_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_next_date ON public.resource_maintenance_schedule(next_maintenance_date) WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- 4. VERSIONES DE POLÍTICAS INSTITUCIONALES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.policy_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID REFERENCES public.institutional_policies(id) ON DELETE CASCADE NOT NULL,
    version TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    slug TEXT,
    changed_by UUID REFERENCES auth.users(id),
    change_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(policy_id, version)
);

CREATE INDEX IF NOT EXISTS idx_policy_versions_policy_id ON public.policy_versions(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_versions_created_at ON public.policy_versions(created_at DESC);

-- Agregar campos a institutional_policies si no existen
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'institutional_policies' AND column_name = 'updated_by') THEN
        ALTER TABLE public.institutional_policies 
        ADD COLUMN updated_by UUID REFERENCES auth.users(id),
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now(),
        ADD COLUMN requires_acceptance BOOLEAN DEFAULT false;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. ACEPTACIÓN DE POLÍTICAS POR USUARIOS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.policy_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    policy_id UUID REFERENCES public.institutional_policies(id) ON DELETE CASCADE NOT NULL,
    version TEXT NOT NULL,
    accepted_at TIMESTAMPTZ DEFAULT now(),
    ip_address TEXT,
    user_agent TEXT,
    UNIQUE(user_id, policy_id, version)
);

CREATE INDEX IF NOT EXISTS idx_acceptances_user_id ON public.policy_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_acceptances_policy_id ON public.policy_acceptances(policy_id);

-- ----------------------------------------------------------------------------
-- 6. SESIONES DE USUARIO
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    device_info JSONB, -- {device, browser, os, ip}
    ip_address TEXT,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.user_sessions(user_id, is_active) WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- 7. CONFIGURACIÓN DE NOTIFICACIONES POR EMAIL
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    notification_type TEXT NOT NULL, -- 'loan_approved', 'event_reminder', etc.
    enabled BOOLEAN DEFAULT true,
    frequency TEXT DEFAULT 'immediate', -- 'immediate', 'daily', 'weekly'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_email_settings_user_id ON public.email_notification_settings(user_id);

-- ----------------------------------------------------------------------------
-- 8. PLANTILLAS DE EMAIL
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    variables JSONB, -- Variables disponibles en la plantilla
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 9. HISTORIAL DE ACTIVIDAD DE USUARIOS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL, -- 'loan_requested', 'event_enrolled', 'profile_updated', etc.
    entity_type TEXT, -- 'loan', 'event', 'profile', etc.
    entity_id UUID,
    description TEXT,
    metadata JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_user_id ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON public.user_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON public.user_activity_log(entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- 10. FUNCIÓN: Calcular multa automática por daño
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_damage_fine(
    p_damage_type TEXT,
    p_severity TEXT,
    p_resource_id UUID
)
RETURNS NUMERIC(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_base_fine NUMERIC(10,2);
    v_severity_multiplier NUMERIC(3,2);
    v_final_fine NUMERIC(10,2);
BEGIN
    -- Multa base según tipo
    CASE p_damage_type
        WHEN 'damage' THEN v_base_fine := 50000; -- $50,000 COP
        WHEN 'loss' THEN v_base_fine := 200000; -- $200,000 COP
        WHEN 'theft' THEN v_base_fine := 300000; -- $300,000 COP
        ELSE v_base_fine := 0;
    END CASE;
    
    -- Multiplicador por severidad
    CASE p_severity
        WHEN 'minor' THEN v_severity_multiplier := 0.5;
        WHEN 'moderate' THEN v_severity_multiplier := 1.0;
        WHEN 'severe' THEN v_severity_multiplier := 1.5;
        WHEN 'total_loss' THEN v_severity_multiplier := 2.0;
        ELSE v_severity_multiplier := 1.0;
    END CASE;
    
    v_final_fine := v_base_fine * v_severity_multiplier;
    
    RETURN v_final_fine;
END;
$$;

-- ----------------------------------------------------------------------------
-- 11. TRIGGER: Registrar movimiento de recurso automáticamente
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_resource_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Registrar cambio de estado
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.resource_movements (
            resource_id,
            loan_id,
            movement_type,
            from_status,
            to_status,
            performed_by
        ) VALUES (
            NEW.id,
            NULL, -- Se puede obtener del préstamo activo si existe
            'status_change',
            OLD.status::TEXT,
            NEW.status::TEXT,
            auth.uid()
        );
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_resource_movement ON public.resources;
CREATE TRIGGER trigger_log_resource_movement
    AFTER UPDATE OF status ON public.resources
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.log_resource_movement();

-- ----------------------------------------------------------------------------
-- 12. TRIGGER: Registrar movimiento cuando se crea/termina préstamo
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_loan_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
        INSERT INTO public.resource_movements (
            resource_id,
            loan_id,
            movement_type,
            from_status,
            to_status
        ) VALUES (
            NEW.resource_id,
            NEW.id,
            'loan_start',
            'available',
            'borrowed'
        );
    ELSIF TG_OP = 'UPDATE' AND OLD.status != 'returned' AND NEW.status = 'returned' THEN
        INSERT INTO public.resource_movements (
            resource_id,
            loan_id,
            movement_type,
            from_status,
            to_status
        ) VALUES (
            NEW.resource_id,
            NEW.id,
            'loan_end',
            'borrowed',
            'available'
        );
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_loan_movement ON public.loans;
CREATE TRIGGER trigger_log_loan_movement
    AFTER INSERT OR UPDATE OF status ON public.loans
    FOR EACH ROW
    EXECUTE FUNCTION public.log_loan_movement();

-- ----------------------------------------------------------------------------
-- 13. TRIGGER: Crear versión de política al actualizar
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_policy_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Guardar versión anterior antes de actualizar
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO public.policy_versions (
            policy_id,
            version,
            title,
            content,
            slug,
            changed_by,
            change_notes
        ) VALUES (
            OLD.id,
            OLD.version,
            OLD.title,
            OLD.content,
            OLD.slug,
            auth.uid(),
            'Actualización automática'
        );
        
        -- Actualizar versión (incrementar)
        NEW.version := (SELECT COALESCE(MAX(CAST(SPLIT_PART(version, '.', 1) AS INTEGER)), 0) + 1 
                       FROM public.policy_versions 
                       WHERE policy_id = OLD.id) || '.0';
        NEW.updated_by := auth.uid();
        NEW.updated_at := now();
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_policy_version ON public.institutional_policies;
CREATE TRIGGER trigger_create_policy_version
    BEFORE UPDATE ON public.institutional_policies
    FOR EACH ROW
    WHEN (OLD.title IS DISTINCT FROM NEW.title OR OLD.content IS DISTINCT FROM NEW.content)
    EXECUTE FUNCTION public.create_policy_version();

-- ----------------------------------------------------------------------------
-- 14. POLÍTICAS RLS
-- ----------------------------------------------------------------------------

-- Resource Damages
ALTER TABLE public.resource_damages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own damages" ON public.resource_damages;
CREATE POLICY "Users can view own damages" ON public.resource_damages
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff can manage damages" ON public.resource_damages;
CREATE POLICY "Staff can manage damages" ON public.resource_damages
    FOR ALL USING (is_staff());

-- Resource Movements
ALTER TABLE public.resource_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view movements" ON public.resource_movements;
CREATE POLICY "Public can view movements" ON public.resource_movements
    FOR SELECT USING (true);

-- Maintenance Schedule
ALTER TABLE public.resource_maintenance_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage maintenance" ON public.resource_maintenance_schedule;
CREATE POLICY "Staff can manage maintenance" ON public.resource_maintenance_schedule
    FOR ALL USING (is_staff());

-- Policy Versions
ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view policy versions" ON public.policy_versions;
CREATE POLICY "Public can view policy versions" ON public.policy_versions
    FOR SELECT USING (true);

-- Policy Acceptances
ALTER TABLE public.policy_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own acceptances" ON public.policy_acceptances;
CREATE POLICY "Users can view own acceptances" ON public.policy_acceptances
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own acceptances" ON public.policy_acceptances;
CREATE POLICY "Users can create own acceptances" ON public.policy_acceptances
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- User Sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sessions" ON public.user_sessions;
CREATE POLICY "Users can view own sessions" ON public.user_sessions
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own sessions" ON public.user_sessions;
CREATE POLICY "Users can manage own sessions" ON public.user_sessions
    FOR UPDATE USING (user_id = auth.uid());

-- Email Notification Settings
ALTER TABLE public.email_notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own email settings" ON public.email_notification_settings;
CREATE POLICY "Users can manage own email settings" ON public.email_notification_settings
    FOR ALL USING (user_id = auth.uid());

-- Email Templates
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage email templates" ON public.email_templates;
CREATE POLICY "Admins can manage email templates" ON public.email_templates
    FOR ALL USING (is_admin());

-- User Activity Log
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own activity" ON public.user_activity_log;
CREATE POLICY "Users can view own activity" ON public.user_activity_log
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all activity" ON public.user_activity_log;
CREATE POLICY "Admins can view all activity" ON public.user_activity_log
    FOR SELECT USING (is_admin());

-- Institutional Policies (agregar políticas si no existen)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'institutional_policies' 
        AND policyname = 'Public can view active policies'
    ) THEN
        DROP POLICY IF EXISTS "Public can view active policies" ON public.institutional_policies;
        CREATE POLICY "Public can view active policies" ON public.institutional_policies
            FOR SELECT USING (is_active = true);
        
        DROP POLICY IF EXISTS "Admins can manage policies" ON public.institutional_policies;
        CREATE POLICY "Admins can manage policies" ON public.institutional_policies
            FOR ALL USING (is_admin());
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 15. COMENTARIOS
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public.resource_damages IS 'Registro de daños, pérdidas y multas de recursos';
COMMENT ON TABLE public.resource_movements IS 'Historial de movimientos y cambios de estado de recursos';
COMMENT ON TABLE public.resource_maintenance_schedule IS 'Programación de mantenimientos preventivos y correctivos';
COMMENT ON TABLE public.policy_versions IS 'Historial de versiones de políticas institucionales';
COMMENT ON TABLE public.policy_acceptances IS 'Registro de aceptación de políticas por usuarios';
COMMENT ON TABLE public.user_sessions IS 'Sesiones activas de usuarios para gestión de dispositivos';
COMMENT ON TABLE public.email_notification_settings IS 'Preferencias de notificaciones por email por usuario';
COMMENT ON TABLE public.email_templates IS 'Plantillas de emails para notificaciones';
COMMENT ON TABLE public.user_activity_log IS 'Log de actividad de usuarios para auditoría';
