-- ============================================================================
-- ESQUEMA MAESTRO ENTERPRISE DEFINITIVO - UNIVERSIDAD COOPERATIVA DE COLOMBIA
-- ============================================================================
-- Este script realiza una instalación limpia/actualización de Bienestar Hub UCC.
-- ============================================================================

-- 1. EXTENSIONES Y SEGURIDAD BASE
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'coordinator', 'manager', 'monitor', 'student');
    END IF;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. INFRAESTRUCTURA INSTITUCIONAL
CREATE TABLE IF NOT EXISTS public.campuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    address TEXT,
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

-- 3. PERFILES Y ROLES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    student_code TEXT UNIQUE,
    phone TEXT,
    email TEXT NOT NULL,
    campus_id UUID REFERENCES public.campuses(id),
    program_id UUID REFERENCES public.academic_programs(id),
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

-- 4. CONFIGURACIÓN Y POLÍTICAS
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.institutional_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE,
    content TEXT,
    version TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RECURSOS Y EVENTOS
CREATE TABLE IF NOT EXISTS public.resource_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    base_wellness_hours NUMERIC(5,2) DEFAULT 1.0,
    hourly_factor NUMERIC(5,2) DEFAULT 0.0,
    is_low_risk BOOLEAN DEFAULT false,
    max_loan_days INTEGER DEFAULT 7,
    requires_approval BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.resource_categories(id),
    campus_id UUID REFERENCES public.campuses(id),
    name TEXT NOT NULL,
    serial_number TEXT UNIQUE,
    status TEXT DEFAULT 'available',
    condition_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
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
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, user_id)
);

-- 6. SEGURIDAD (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Políticas Básicas (Permitir lectura para todos los autenticados)
DROP POLICY IF EXISTS "Public Select" ON public.profiles;
CREATE POLICY "Public Select" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Select" ON public.campuses;
CREATE POLICY "Public Select" ON public.campuses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Select" ON public.academic_programs;
CREATE POLICY "Public Select" ON public.academic_programs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Select" ON public.resources;
CREATE POLICY "Public Select" ON public.resources FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Select" ON public.events;
CREATE POLICY "Public Select" ON public.events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Select" ON public.resource_categories;
CREATE POLICY "Public Select" ON public.resource_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Select" ON public.event_categories;
CREATE POLICY "Public Select" ON public.event_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Select" ON public.system_settings;
CREATE POLICY "Public Select" ON public.system_settings FOR SELECT USING (true);

-- 7. TRIGGER DE REGISTRO
CREATE OR REPLACE FUNCTION public.handle_new_user_v2()
RETURNS TRIGGER AS $$
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
    ) ON CONFLICT (user_id) DO UPDATE SET updated_at = now();

    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student') ON CONFLICT DO NOTHING;
    INSERT INTO public.student_behavioral_status (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_v2();

-- 8. DATOS INSTITUCIONALES UCC (SEMILLAS)
INSERT INTO public.campuses (name, code, address) VALUES
('Universidad Cooperativa de Colombia - Sede Montería', 'UCC-MTR', 'Carrera 6 No. 66B - 14, Montería, Córdoba'),
('Universidad Cooperativa de Colombia - Sede Bogotá', 'UCC-BOG', 'Avenida Caracas No. 37 - 63, Bogotá D.C.'),
('Universidad Cooperativa de Colombia - Sede Medellín', 'UCC-MED', 'Calle 50 No. 41 - 70, Medellín, Antioquia'),
('Universidad Cooperativa de Colombia - Sede Bucaramanga', 'UCC-BGA', 'Carrera 33 No. 30 - 20, Bucaramanga, Santander'),
('Universidad Cooperativa de Colombia - Campus Virtual', 'UCC-VIR', 'Modalidad Virtual – Colombia')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address;

INSERT INTO public.academic_programs (name, code, faculty) VALUES
('Ingeniería de Sistemas', 'ING-SIS', 'Facultad de Ingeniería'),
('Administración de Empresas', 'ADM-EMP', 'Facultad de Ciencias Económicas'),
('Derecho', 'DER-001', 'Facultad de Derecho'),
('Psicología', 'PSI-001', 'Facultad de Psicología'),
('Contaduría Pública', 'CON-PUB', 'Facultad de Ciencias Económicas'),
('Enfermería', 'ENF-001', 'Facultad de Ciencias de la Salud'),
('Licenciatura en Educación Física', 'LEF-001', 'Facultad de Educación')
ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code, faculty = EXCLUDED.faculty;

INSERT INTO public.resource_categories (name, icon, base_wellness_hours, max_loan_days, requires_approval) VALUES
('Deporte y Recreación', 'Dribbble', 2.0, 3, false),
('Cultura y Arte', 'Music', 2.5, 5, false),
('Tecnología Educativa', 'Laptop', 3.0, 7, true),
('Instrumentos Musicales', 'Mic', 3.5, 5, true),
('Juegos de Mesa', 'Gamepad', 1.5, 2, false)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.event_categories (name, icon) VALUES
('Actividad Deportiva', 'Trophy'),
('Evento Cultural', 'Music'),
('Salud Mental', 'Heart'),
('Integración Universitaria', 'Users'),
('Responsabilidad Social', 'Globe')
ON CONFLICT (name) DO UPDATE SET icon = EXCLUDED.icon;

INSERT INTO public.system_settings (key, value, description) VALUES
('loan_timeout_minutes', '15', 'Tiempo máximo para recoger un recurso aprobado'),
('pending_timeout_minutes', '30', 'Tiempo antes de que expire una solicitud pendiente'),
('max_active_loans', '3', 'Límite de préstamos simultáneos por estudiante'),
('max_loan_days', '7', 'Máximo de días permitidos para préstamo estándar'),
('late_penalty_hours', '-1', 'Penalización por hora de retraso'),
('damage_penalty_hours', '-5', 'Penalización por daño reportado'),
('lost_penalty_hours', '-10', 'Penalización por pérdida de recurso'),
('auto_approve_low_risk', 'true', 'Habilita aprobación automática para recursos de bajo riesgo'),
('min_trust_score_auto_approve', '80', 'Puntaje mínimo de confianza para auto-aprobación'),
('enable_queue_system', 'true', 'Habilita el sistema de colas de espera')
ON CONFLICT (key) DO NOTHING;

-- RECURSOS DE PRUEBA (MONTERÍA)
DO $$
DECLARE
    sede_mtr UUID; cat_dep UUID;
BEGIN
    SELECT id INTO sede_mtr FROM public.campuses WHERE code = 'UCC-MTR' LIMIT 1;
    SELECT id INTO cat_dep FROM public.resource_categories WHERE name = 'Deporte y Recreación' LIMIT 1;
    IF sede_mtr IS NOT NULL AND cat_dep IS NOT NULL THEN
        INSERT INTO public.resources (category_id, campus_id, name, serial_number, condition_notes)
        VALUES (cat_dep, sede_mtr, 'Balón de Fútbol Profesional', 'DEP-FUT-001', 'Buen estado')
        ON CONFLICT (serial_number) DO NOTHING;
    END IF;
END $$;
