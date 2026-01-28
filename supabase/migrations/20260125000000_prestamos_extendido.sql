-- ============================================================================
-- MIGRACIÓN: FUNCIONALIDADES EXTENDIDAS DE PRÉSTAMOS
-- ============================================================================
-- Agrega: extensiones, calificaciones, recordatorios, renovación automática
-- ============================================================================

-- ============================================================================
-- 1. NUEVAS COLUMNAS EN LOANS
-- ============================================================================

-- Columnas para extensión de préstamos
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS extension_requested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS extension_reason TEXT,
ADD COLUMN IF NOT EXISTS extension_approved BOOLEAN,
ADD COLUMN IF NOT EXISTS extension_approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS extension_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS original_due_date TIMESTAMPTZ;

-- Columnas para calificación post-devolución
ALTER TABLE public.loans
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5),
ADD COLUMN IF NOT EXISTS rating_comment TEXT,
ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

-- Columna para recordatorios enviados
ALTER TABLE public.loans
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_renewed BOOLEAN DEFAULT false;

-- ============================================================================
-- 2. ÍNDICES PARA PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_loans_extension_requested ON public.loans(extension_requested) WHERE extension_requested = true;
CREATE INDEX IF NOT EXISTS idx_loans_due_date_active ON public.loans(due_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_loans_unrated ON public.loans(status, rating) WHERE status = 'returned' AND rating IS NULL;

-- ============================================================================
-- 3. FUNCIÓN: APROBAR EXTENSIÓN
-- ============================================================================
CREATE OR REPLACE FUNCTION public.approve_loan_extension(
    p_loan_id UUID,
    p_approved BOOLEAN,
    p_admin_id UUID,
    p_new_due_date TIMESTAMPTZ DEFAULT NULL,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_due_date TIMESTAMPTZ;
    v_resource_id UUID;
    v_user_id UUID;
BEGIN
    -- Obtener datos actuales del préstamo
    SELECT due_date, resource_id, user_id INTO v_current_due_date, v_resource_id, v_user_id
    FROM public.loans
    WHERE id = p_loan_id AND extension_requested = true AND extension_approved IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Préstamo no encontrado o extensión ya procesada';
    END IF;

    -- Actualizar el préstamo
    UPDATE public.loans SET
        extension_approved = p_approved,
        extension_approved_by = p_admin_id,
        extension_approved_at = now(),
        original_due_date = CASE WHEN p_approved AND original_due_date IS NULL THEN v_current_due_date ELSE original_due_date END,
        due_date = CASE WHEN p_approved AND p_new_due_date IS NOT NULL THEN p_new_due_date ELSE due_date END,
        admin_notes = COALESCE(p_admin_notes, admin_notes)
    WHERE id = p_loan_id;

    -- Notificar al estudiante
    INSERT INTO public.notifications (user_id, type, title, message, link, data)
    VALUES (
        v_user_id,
        CASE WHEN p_approved THEN 'extension_approved' ELSE 'extension_rejected' END,
        CASE WHEN p_approved THEN 'Extensión aprobada' ELSE 'Extensión rechazada' END,
        CASE WHEN p_approved 
            THEN 'Tu solicitud de extensión fue aprobada. Nueva fecha: ' || to_char(p_new_due_date, 'DD/MM/YYYY')
            ELSE 'Tu solicitud de extensión fue rechazada. Por favor devuelve el recurso a tiempo.'
        END,
        '/my-loans',
        jsonb_build_object('loan_id', p_loan_id, 'approved', p_approved)
    );
END;
$$;

-- ============================================================================
-- 4. FUNCIÓN: RENOVACIÓN AUTOMÁTICA (si no hay cola)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_renew_loan(p_loan_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_resource_id UUID;
    v_user_id UUID;
    v_current_due_date TIMESTAMPTZ;
    v_max_loan_days INTEGER := 7;
    v_queue_count INTEGER;
    v_new_due_date TIMESTAMPTZ;
BEGIN
    -- Obtener datos del préstamo
    SELECT resource_id, user_id, due_date INTO v_resource_id, v_user_id, v_current_due_date
    FROM public.loans
    WHERE id = p_loan_id AND status = 'active';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Verificar si hay cola de espera
    SELECT COUNT(*) INTO v_queue_count
    FROM public.resource_queue
    WHERE resource_id = v_resource_id AND status = 'waiting';

    IF v_queue_count > 0 THEN
        -- Hay cola, no se puede renovar
        RETURN FALSE;
    END IF;

    -- Obtener días máximos de la categoría del recurso
    SELECT COALESCE(rc.max_loan_days, 7) INTO v_max_loan_days
    FROM public.resources r
    JOIN public.resource_categories rc ON r.category_id = rc.id
    WHERE r.id = v_resource_id;

    -- Calcular nueva fecha
    v_new_due_date := v_current_due_date + (v_max_loan_days || ' days')::interval;

    -- Actualizar préstamo
    UPDATE public.loans SET
        due_date = v_new_due_date,
        auto_renewed = true,
        original_due_date = COALESCE(original_due_date, v_current_due_date)
    WHERE id = p_loan_id;

    -- Notificar al estudiante
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
        v_user_id,
        'auto_renewal',
        'Préstamo renovado automáticamente',
        'Tu préstamo fue renovado hasta el ' || to_char(v_new_due_date, 'DD/MM/YYYY'),
        '/my-loans'
    );

    RETURN TRUE;
END;
$$;

-- ============================================================================
-- 5. FUNCIÓN: ENVIAR RECORDATORIOS DE VENCIMIENTO
-- ============================================================================
-- Esta función debe ejecutarse periódicamente (via cron/pg_cron o Edge Function)
CREATE OR REPLACE FUNCTION public.send_due_date_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
    v_loan RECORD;
BEGIN
    -- Buscar préstamos que vencen en 1-2 días y no han recibido recordatorio
    FOR v_loan IN
        SELECT l.id, l.user_id, l.due_date, r.name as resource_name
        FROM public.loans l
        JOIN public.resources r ON l.resource_id = r.id
        WHERE l.status = 'active'
          AND l.due_date BETWEEN now() AND now() + interval '2 days'
          AND l.reminder_sent_at IS NULL
    LOOP
        -- Crear notificación de recordatorio
        INSERT INTO public.notifications (user_id, type, title, message, link, data)
        VALUES (
            v_loan.user_id,
            'due_date_reminder',
            '⏰ Recordatorio de devolución',
            'Tu préstamo de "' || v_loan.resource_name || '" vence el ' || to_char(v_loan.due_date, 'DD/MM/YYYY') || '. Recuerda devolverlo a tiempo.',
            '/my-loans',
            jsonb_build_object('loan_id', v_loan.id, 'due_date', v_loan.due_date)
        );

        -- Marcar como enviado
        UPDATE public.loans SET reminder_sent_at = now() WHERE id = v_loan.id;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- ============================================================================
-- 6. FUNCIÓN: MARCAR PRÉSTAMOS VENCIDOS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.mark_overdue_loans()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- Actualizar préstamos activos que ya vencieron
    UPDATE public.loans
    SET status = 'overdue'
    WHERE status = 'active'
      AND due_date < now();

    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- Notificar a los estudiantes con préstamos recién vencidos
    INSERT INTO public.notifications (user_id, type, title, message, link, data)
    SELECT 
        l.user_id,
        'loan_overdue',
        '⚠️ Préstamo vencido',
        'Tu préstamo de "' || r.name || '" está vencido. Por favor devuélvelo lo antes posible.',
        '/my-loans',
        jsonb_build_object('loan_id', l.id)
    FROM public.loans l
    JOIN public.resources r ON l.resource_id = r.id
    WHERE l.status = 'overdue'
      AND NOT EXISTS (
          SELECT 1 FROM public.notifications n 
          WHERE n.type = 'loan_overdue' 
            AND n.data->>'loan_id' = l.id::text
      );

    RETURN v_count;
END;
$$;

-- ============================================================================
-- 7. TRIGGER: NOTIFICAR ADMINS SOBRE EXTENSIONES
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_extension_request()
RETURNS TRIGGER AS $$
DECLARE
    admin_ids UUID[];
    student_name TEXT;
    resource_name TEXT;
BEGIN
    -- Solo actuar cuando se solicita una extensión
    IF NEW.extension_requested = true AND (OLD.extension_requested IS NULL OR OLD.extension_requested = false) THEN
        -- Obtener admins
        SELECT ARRAY_AGG(user_id) INTO admin_ids
        FROM public.user_roles
        WHERE role IN ('admin', 'coordinator');

        -- Obtener nombres
        SELECT full_name INTO student_name FROM public.profiles WHERE user_id = NEW.user_id;
        SELECT name INTO resource_name FROM public.resources WHERE id = NEW.resource_id;

        -- Crear notificaciones
        IF admin_ids IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, type, title, message, link, data)
            SELECT 
                unnest(admin_ids),
                'extension_request',
                'Solicitud de extensión',
                student_name || ' solicita extensión para ' || resource_name,
                '/admin/loans',
                jsonb_build_object('loan_id', NEW.id, 'user_id', NEW.user_id);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_extension_request ON public.loans;
CREATE TRIGGER on_extension_request
AFTER UPDATE ON public.loans
FOR EACH ROW
WHEN (NEW.extension_requested = true AND (OLD.extension_requested IS NULL OR OLD.extension_requested = false))
EXECUTE FUNCTION public.notify_extension_request();

-- ============================================================================
-- 8. VISTA: ESTADÍSTICAS DE CALIFICACIONES POR RECURSO
-- ============================================================================
CREATE OR REPLACE VIEW public.resource_ratings AS
SELECT 
    r.id as resource_id,
    r.name as resource_name,
    COUNT(l.rating) as total_ratings,
    ROUND(AVG(l.rating)::numeric, 2) as avg_rating,
    COUNT(CASE WHEN l.rating = 5 THEN 1 END) as five_star,
    COUNT(CASE WHEN l.rating = 4 THEN 1 END) as four_star,
    COUNT(CASE WHEN l.rating = 3 THEN 1 END) as three_star,
    COUNT(CASE WHEN l.rating = 2 THEN 1 END) as two_star,
    COUNT(CASE WHEN l.rating = 1 THEN 1 END) as one_star
FROM public.resources r
LEFT JOIN public.loans l ON r.id = l.resource_id AND l.rating IS NOT NULL
GROUP BY r.id, r.name;

-- ============================================================================
-- FIN - MIGRACIÓN PRÉSTAMOS EXTENDIDO
-- ============================================================================
