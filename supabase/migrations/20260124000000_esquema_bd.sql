-- ============================================================================
-- ESQUEMA MAESTRO ENTERPRISE HARDENED - BIENESTAR HUB (PRODUCCIÓN)
-- ============================================================================
-- Nota: El orden de este script es crítico para evitar errores de relación.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONES Y ENUMS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'coordinator', 'manager', 'monitor', 'student');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loan_status') THEN
        CREATE TYPE public.loan_status AS ENUM ('pending', 'approved', 'active', 'returned', 'overdue', 'lost', 'damaged', 'rejected', 'expired');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_status') THEN
        CREATE TYPE public.resource_status AS ENUM ('available', 'reserved', 'borrowed', 'maintenance', 'retired');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'decision_source') THEN
        CREATE TYPE public.decision_source AS ENUM ('automatic', 'human', 'exception');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sanction_severity') THEN
        CREATE TYPE public.sanction_severity AS ENUM ('low', 'medium', 'high', 'critical');
    END IF;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ----------------------------------------------------------------------------
-- 2. INFRAESTRUCTURA INSTITUCIONAL (BASES)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    address TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academic_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    faculty TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. IDENTIDAD Y ROLES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    student_code TEXT UNIQUE,
    phone TEXT,
    email TEXT NOT NULL,
    campus_id UUID REFERENCES public.campuses(id),
    program_id UUID REFERENCES public.academic_programs(id),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role,
    assigned_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.student_behavioral_status (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    trust_score INTEGER DEFAULT 100 CHECK (trust_score BETWEEN 0 AND 200),
    is_blocked BOOLEAN DEFAULT false,
    blocked_until TIMESTAMPTZ,
    last_intervention_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Función para calcular el puntaje de confianza
CREATE OR REPLACE FUNCTION public.calculate_trust_score(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_loans INTEGER;
    v_late_returns INTEGER;
    v_lost_damaged INTEGER;
    v_new_score INTEGER := 100;
BEGIN
    SELECT count(*) INTO v_total_loans FROM public.loans WHERE user_id = p_user_id AND status = 'returned';
    SELECT count(*) INTO v_late_returns FROM public.loans 
    WHERE user_id = p_user_id AND status = 'returned' AND returned_at > due_date;
    SELECT count(*) INTO v_lost_damaged FROM public.loans 
    WHERE user_id = p_user_id AND status IN ('lost', 'damaged');

    v_new_score := v_new_score + (v_total_loans * 2);
    v_new_score := v_new_score - (v_late_returns * 5);
    v_new_score := v_new_score - (v_lost_damaged * 20);

    IF v_new_score > 200 THEN v_new_score := 200; END IF;
    IF v_new_score < 0 THEN v_new_score := 0; END IF;

    UPDATE public.student_behavioral_status 
    SET trust_score = v_new_score, updated_at = now()
    WHERE user_id = p_user_id;
END;
$$;

-- Función para verificar auto-aprobación
CREATE OR REPLACE FUNCTION public.can_auto_approve(p_user_id UUID, p_resource_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_trust_score INTEGER;
    v_is_blocked BOOLEAN;
    v_requires_approval BOOLEAN;
BEGIN
    SELECT trust_score, is_blocked INTO v_trust_score, v_is_blocked 
    FROM public.student_behavioral_status 
    WHERE user_id = p_user_id;

    IF v_is_blocked OR v_trust_score < 100 THEN
        RETURN FALSE;
    END IF;

    SELECT rc.requires_approval INTO v_requires_approval
    FROM public.resources r
    JOIN public.resource_categories rc ON r.category_id = rc.id
    WHERE r.id = p_resource_id;

    RETURN NOT v_requires_approval;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. CONTROL DE ACCESO (SECURITY DEFINER)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'coordinator')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'coordinator', 'manager', 'monitor')
    );
$$;

-- ----------------------------------------------------------------------------
-- 5. POLÍTICAS INSTITUCIONALES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.institutional_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE,
    content TEXT,
    version TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 6. SANCIONES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_sanctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    policy_id UUID REFERENCES public.institutional_policies(id),
    severity public.sanction_severity DEFAULT 'low',
    reason TEXT NOT NULL,
    start_date TIMESTAMPTZ DEFAULT now(),
    end_date TIMESTAMPTZ,
    status TEXT DEFAULT 'active',
    appeal_notes TEXT,
    issued_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 7. RECURSOS Y PRÉSTAMOS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resource_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    image_url TEXT,
    base_wellness_hours NUMERIC(5,2) DEFAULT 1.0,
    hourly_factor NUMERIC(5,2) DEFAULT 0.0,
    is_low_risk BOOLEAN DEFAULT false,
    max_loan_days INTEGER DEFAULT 7,
    requires_approval BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read settings" ON public.system_settings;
CREATE POLICY "Public read settings" ON public.system_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage settings" ON public.system_settings;
CREATE POLICY "Admins manage settings" ON public.system_settings FOR ALL USING (is_admin());

CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.resource_categories(id),
    campus_id UUID REFERENCES public.campuses(id),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    serial_number TEXT UNIQUE,
    status public.resource_status DEFAULT 'available',
    notes TEXT,
    condition_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    resource_id UUID REFERENCES public.resources(id) NOT NULL,
    status public.loan_status DEFAULT 'pending',
    decision_source public.decision_source DEFAULT 'human',
    operator_id UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    policy_id UUID REFERENCES public.institutional_policies(id),
    requested_at TIMESTAMPTZ DEFAULT now(),
    approved_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    pickup_deadline TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    returned_at TIMESTAMPTZ,
    rejection_reason TEXT,
    admin_notes TEXT,
    damage_notes TEXT,
    condition_on_return TEXT,
    trust_score_at_request INTEGER,
    created_by_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.resource_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    status TEXT DEFAULT 'waiting',
    notified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    requested_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 8. EVENTOS Y BIENESTAR
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    location TEXT,
    max_participants INTEGER,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    wellness_hours NUMERIC(5,2) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT true,
    category_id UUID REFERENCES public.event_categories(id),
    campus_id UUID REFERENCES public.campuses(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    attended BOOLEAN DEFAULT false,
    attendance_registered_at TIMESTAMPTZ,
    attendance_registered_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_events_active_date ON public.events(is_active, end_date);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_event_id ON public.event_enrollments(event_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.event_enrollments(user_id);

CREATE TABLE IF NOT EXISTS public.wellness_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    hours NUMERIC(5,2) NOT NULL,
    source_type TEXT NOT NULL,
    source_id UUID,
    awarded_by UUID REFERENCES auth.users(id),
    description TEXT,
    is_valid BOOLEAN DEFAULT true,
    awarded_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 9. AUDITORÍA
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID REFERENCES auth.users(id),
    action_category TEXT NOT NULL,
    action_type TEXT NOT NULL,
    table_name TEXT,
    row_id UUID,
    old_data JSONB,
    new_data JSONB,
    justification TEXT NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 10. RLS EN TABLAS SENSIBLES
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_behavioral_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellness_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_sanctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 11. POLÍTICAS RLS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff and Admins manage profiles" ON public.profiles;
CREATE POLICY "Staff and Admins manage profiles" ON public.profiles
FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Student views own behavioral status" ON public.student_behavioral_status;
CREATE POLICY "Student views own behavioral status" ON public.student_behavioral_status
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage behavioral status" ON public.student_behavioral_status;
CREATE POLICY "Admins manage behavioral status" ON public.student_behavioral_status
FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles
FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Users view own loans" ON public.loans;
CREATE POLICY "Users view own loans" ON public.loans
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff manage loans" ON public.loans;
CREATE POLICY "Staff manage loans" ON public.loans
FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Students can request loans" ON public.loans;
CREATE POLICY "Students can request loans" ON public.loans
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public read campuses" ON public.campuses;
CREATE POLICY "Public read campuses" ON public.campuses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read academic_programs" ON public.academic_programs;
CREATE POLICY "Public read academic_programs" ON public.academic_programs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read resources" ON public.resources;
CREATE POLICY "Public read resources" ON public.resources
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff manage resources" ON public.resources;
CREATE POLICY "Staff manage resources" ON public.resources
FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Public select queue" ON public.resource_queue;
CREATE POLICY "Public select queue" ON public.resource_queue FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can join queue" ON public.resource_queue;
CREATE POLICY "Users can join queue" ON public.resource_queue FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave queue" ON public.resource_queue;
CREATE POLICY "Users can leave queue" ON public.resource_queue FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public read events" ON public.events;
CREATE POLICY "Public read events" ON public.events
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff manage events" ON public.events;
CREATE POLICY "Staff manage events" ON public.events
FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Public read event categories" ON public.event_categories;
CREATE POLICY "Public read event categories" ON public.event_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read resource categories" ON public.resource_categories;
CREATE POLICY "Public read resource categories" ON public.resource_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public select enrollments" ON public.event_enrollments;
CREATE POLICY "Public select enrollments" ON public.event_enrollments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can enroll themselves" ON public.event_enrollments;
CREATE POLICY "Users can enroll themselves" ON public.event_enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can cancel their enrollment" ON public.event_enrollments;
CREATE POLICY "Users can cancel their enrollment" ON public.event_enrollments FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Student view own wellness hours" ON public.wellness_hours;
CREATE POLICY "Student view own wellness hours" ON public.wellness_hours
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff insert wellness hours" ON public.wellness_hours;
CREATE POLICY "Staff insert wellness hours" ON public.wellness_hours
FOR INSERT WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Admins manage wellness hours" ON public.wellness_hours;
CREATE POLICY "Admins manage wellness hours" ON public.wellness_hours
FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Student view own sanctions" ON public.student_sanctions;
CREATE POLICY "Student view own sanctions" ON public.student_sanctions
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage sanctions" ON public.student_sanctions;
CREATE POLICY "Admins manage sanctions" ON public.student_sanctions
FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins only audit access" ON public.audit_logs;
CREATE POLICY "Admins only audit access" ON public.audit_logs
FOR ALL USING (is_admin());

-- ----------------------------------------------------------------------------
-- 12. TRIGGER DE USUARIOS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email, student_code, phone, campus_id, program_id)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 
        NEW.email,
        NEW.raw_user_meta_data->>'student_code',
        NEW.raw_user_meta_data->>'phone',
        (NULLIF(NEW.raw_user_meta_data->>'campus_id', ''))::uuid,
        (NULLIF(NEW.raw_user_meta_data->>'program_id', ''))::uuid
    )
    ON CONFLICT (user_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        student_code = EXCLUDED.student_code,
        phone = EXCLUDED.phone,
        campus_id = EXCLUDED.campus_id,
        program_id = EXCLUDED.program_id,
        updated_at = now();

    INSERT INTO public.student_behavioral_status (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student')
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_v2();

-- ----------------------------------------------------------------------------
-- 13. CONFIGURACIÓN STORAGE
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resource-images', 'resource-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public access to resource images" ON storage.objects;
CREATE POLICY "Public access to resource images" ON storage.objects FOR SELECT USING ( bucket_id = 'resource-images' );

DROP POLICY IF EXISTS "Public access to event images" ON storage.objects;
CREATE POLICY "Public access to event images" ON storage.objects FOR SELECT USING ( bucket_id = 'event-images' );

DROP POLICY IF EXISTS "Public access to avatars" ON storage.objects;
CREATE POLICY "Public access to avatars" ON storage.objects FOR SELECT USING ( bucket_id = 'profile-avatars' );

DROP POLICY IF EXISTS "Public access to category images" ON storage.objects;
CREATE POLICY "Public access to category images" ON storage.objects FOR SELECT USING ( bucket_id = 'category-images' );

DROP POLICY IF EXISTS "Staff manage resource images" ON storage.objects;
CREATE POLICY "Staff manage resource images" ON storage.objects FOR ALL WITH CHECK ( bucket_id = 'resource-images' AND (SELECT public.is_staff()) );

DROP POLICY IF EXISTS "Staff manage event images" ON storage.objects;
CREATE POLICY "Staff manage event images" ON storage.objects FOR ALL WITH CHECK ( bucket_id = 'event-images' AND (SELECT public.is_staff()) );

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'profile-avatars' AND auth.uid()::text = (storage.foldername(name))[1] );

DROP POLICY IF EXISTS "Staff manage category images" ON storage.objects;
CREATE POLICY "Staff manage category images" ON storage.objects FOR ALL WITH CHECK ( bucket_id = 'category-images' AND (SELECT public.is_staff()) );

-- ----------------------------------------------------------------------------
-- 14. ALERTAS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_role public.app_role,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    severity TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    entity_type TEXT,
    entity_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own alerts" ON public.alerts;
CREATE POLICY "Users can view own alerts" ON public.alerts
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own alerts" ON public.alerts;
CREATE POLICY "Users can update own alerts" ON public.alerts
FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff can view role alerts" ON public.alerts;
CREATE POLICY "Staff can view role alerts" ON public.alerts
FOR SELECT USING (
    target_role IS NOT NULL AND 
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = target_role
    )
);

DROP POLICY IF EXISTS "Admins manage all alerts" ON public.alerts;
CREATE POLICY "Admins manage all alerts" ON public.alerts
FOR ALL USING (is_admin());

-- ----------------------------------------------------------------------------
-- 15. NOTIFICACIONES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications(user_id, read) 
WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON public.notifications(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION notify_admins_new_loan()
RETURNS TRIGGER AS $$
DECLARE
  admin_ids UUID[];
  student_name TEXT;
  resource_name TEXT;
BEGIN
  IF NEW.status = 'pending' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'pending') THEN
    SELECT ARRAY_AGG(user_id) INTO admin_ids
    FROM user_roles
    WHERE role IN ('admin', 'coordinator');

    SELECT full_name INTO student_name 
    FROM profiles 
    WHERE user_id = NEW.user_id;

    SELECT name INTO resource_name 
    FROM resources 
    WHERE id = NEW.resource_id;

    IF admin_ids IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link, data)
      SELECT 
        unnest(admin_ids),
        'loan_request',
        'Nueva solicitud de préstamo',
        student_name || ' solicita ' || resource_name,
        '/admin/loans',
        jsonb_build_object(
          'loan_id', NEW.id, 
          'resource_id', NEW.resource_id,
          'user_id', NEW.user_id
        );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_loan_request ON public.loans;
CREATE TRIGGER on_loan_request
AFTER INSERT OR UPDATE ON public.loans
FOR EACH ROW
EXECUTE FUNCTION notify_admins_new_loan();

CREATE OR REPLACE FUNCTION mark_loan_notification_read()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
    UPDATE notifications
    SET read = true
    WHERE type = 'loan_request'
      AND data->>'loan_id' = NEW.id::text
      AND read = false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_loan_status_change ON public.loans;
CREATE TRIGGER on_loan_status_change
AFTER UPDATE ON public.loans
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION mark_loan_notification_read();

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

-- ============================================================================
-- FIN – ESQUEMA BD
-- ============================================================================
