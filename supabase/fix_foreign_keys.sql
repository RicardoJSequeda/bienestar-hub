-- FIX: Corregir llaves foráneas para permitir joins con public.profiles
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Sanciones (student_sanctions)
ALTER TABLE public.student_sanctions DROP CONSTRAINT IF EXISTS student_sanctions_user_id_fkey;
ALTER TABLE public.student_sanctions ADD CONSTRAINT student_sanctions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.student_sanctions DROP CONSTRAINT IF EXISTS student_sanctions_issued_by_fkey;
ALTER TABLE public.student_sanctions ADD CONSTRAINT student_sanctions_issued_by_fkey 
    FOREIGN KEY (issued_by) REFERENCES public.profiles(user_id);

ALTER TABLE public.student_sanctions DROP CONSTRAINT IF EXISTS student_sanctions_policy_id_fkey;
ALTER TABLE public.student_sanctions ADD CONSTRAINT student_sanctions_policy_id_fkey 
    FOREIGN KEY (policy_id) REFERENCES public.institutional_policies(id);

-- 2. Préstamos (loans)
ALTER TABLE public.loans DROP CONSTRAINT IF EXISTS loans_user_id_fkey;
ALTER TABLE public.loans ADD CONSTRAINT loans_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);

ALTER TABLE public.loans DROP CONSTRAINT IF EXISTS loans_resource_id_fkey;
ALTER TABLE public.loans ADD CONSTRAINT loans_resource_id_fkey 
    FOREIGN KEY (resource_id) REFERENCES public.resources(id);

-- 3. Inscripciones a Eventos (event_enrollments)
ALTER TABLE public.event_enrollments DROP CONSTRAINT IF EXISTS event_enrollments_user_id_fkey;
ALTER TABLE public.event_enrollments ADD CONSTRAINT event_enrollments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 4. Lista de Espera (event_waitlist)
ALTER TABLE public.event_waitlist DROP CONSTRAINT IF EXISTS event_waitlist_user_id_fkey;
ALTER TABLE public.event_waitlist ADD CONSTRAINT event_waitlist_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 5. Estado Conductual (student_behavioral_status)
ALTER TABLE public.student_behavioral_status DROP CONSTRAINT IF EXISTS student_behavioral_status_user_id_fkey;
ALTER TABLE public.student_behavioral_status ADD CONSTRAINT student_behavioral_status_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 6. Alertas (alerts)
ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_target_user_id_fkey;
ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_user_id_fkey;
-- En la base de datos la columna se llama 'user_id'
ALTER TABLE public.alerts ADD CONSTRAINT alerts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);

-- 7. Recursos (category_id)
ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_category_id_fkey;
ALTER TABLE public.resources ADD CONSTRAINT resources_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES public.resource_categories(id);
