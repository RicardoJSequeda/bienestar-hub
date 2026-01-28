-- ============================================================================
-- MIGRACIÓN: Lista de Espera para Eventos
-- ============================================================================
-- Descripción: Permite a estudiantes unirse a lista de espera cuando eventos
--              están llenos y notificar cuando hay cupo disponible.
-- Fecha: 2026-01-25
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLA: event_waitlist
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    position INTEGER NOT NULL,
    status TEXT DEFAULT 'waiting', -- 'waiting', 'notified', 'expired', 'enrolled'
    notified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, -- Tiempo límite para inscribirse después de notificación
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, user_id)
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_waitlist_event_id ON public.event_waitlist(event_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_user_id ON public.event_waitlist(user_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON public.event_waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_event_status ON public.event_waitlist(event_id, status);

-- ----------------------------------------------------------------------------
-- 2. FUNCIÓN: Actualizar posiciones cuando alguien se une
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_waitlist_positions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Actualizar posiciones de todos los que están después del nuevo registro
    UPDATE public.event_waitlist
    SET position = position + 1
    WHERE event_id = NEW.event_id
      AND position >= NEW.position
      AND id != NEW.id
      AND status = 'waiting';
    
    RETURN NEW;
END;
$$;

-- Trigger para actualizar posiciones
DROP TRIGGER IF EXISTS trigger_update_waitlist_positions ON public.event_waitlist;
CREATE TRIGGER trigger_update_waitlist_positions
    AFTER INSERT ON public.event_waitlist
    FOR EACH ROW
    EXECUTE FUNCTION public.update_waitlist_positions();

-- ----------------------------------------------------------------------------
-- 3. FUNCIÓN: Notificar cuando hay cupo disponible
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_waitlist_on_space()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_waitlist_record RECORD;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Solo procesar cuando se elimina una inscripción (cupo liberado)
    IF TG_OP = 'DELETE' THEN
        -- Buscar el siguiente en lista de espera
        SELECT * INTO v_waitlist_record
        FROM public.event_waitlist
        WHERE event_id = OLD.event_id
          AND status = 'waiting'
        ORDER BY position ASC
        LIMIT 1;
        
        IF v_waitlist_record IS NOT NULL THEN
            -- Calcular tiempo de expiración (24 horas desde ahora)
            v_expires_at := now() + INTERVAL '24 hours';
            
            -- Actualizar estado a 'notified'
            UPDATE public.event_waitlist
            SET status = 'notified',
                notified_at = now(),
                expires_at = v_expires_at
            WHERE id = v_waitlist_record.id;
            
            -- Crear notificación
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                link,
                data
            ) VALUES (
                v_waitlist_record.user_id,
                'waitlist_spot_available',
                'Cupo disponible en evento',
                'Hay un cupo disponible para el evento. Tienes 24 horas para inscribirte.',
                '/events',
                jsonb_build_object('event_id', OLD.event_id, 'waitlist_id', v_waitlist_record.id)
            );
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Trigger para notificar cuando se libera un cupo
DROP TRIGGER IF EXISTS trigger_notify_waitlist_on_space ON public.event_enrollments;
CREATE TRIGGER trigger_notify_waitlist_on_space
    AFTER DELETE ON public.event_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_waitlist_on_space();

-- ----------------------------------------------------------------------------
-- 4. FUNCIÓN: Unirse a lista de espera
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.join_event_waitlist(p_event_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_next_position INTEGER;
    v_waitlist_id UUID;
    v_event RECORD;
BEGIN
    -- Verificar que el evento existe y está activo
    SELECT * INTO v_event
    FROM public.events
    WHERE id = p_event_id AND is_active = true;
    
    IF v_event IS NULL THEN
        RAISE EXCEPTION 'Evento no encontrado o inactivo';
    END IF;
    
    -- Verificar que no esté ya inscrito
    IF EXISTS (
        SELECT 1 FROM public.event_enrollments
        WHERE event_id = p_event_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Ya estás inscrito en este evento';
    END IF;
    
    -- Verificar que no esté ya en lista de espera
    IF EXISTS (
        SELECT 1 FROM public.event_waitlist
        WHERE event_id = p_event_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Ya estás en la lista de espera de este evento';
    END IF;
    
    -- Obtener la siguiente posición
    SELECT COALESCE(MAX(position), 0) + 1 INTO v_next_position
    FROM public.event_waitlist
    WHERE event_id = p_event_id AND status = 'waiting';
    
    -- Insertar en lista de espera
    INSERT INTO public.event_waitlist (
        event_id,
        user_id,
        position,
        status
    ) VALUES (
        p_event_id,
        p_user_id,
        v_next_position,
        'waiting'
    ) RETURNING id INTO v_waitlist_id;
    
    RETURN v_waitlist_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. FUNCIÓN: Inscribirse desde lista de espera
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enroll_from_waitlist(p_waitlist_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_waitlist RECORD;
    v_event RECORD;
    v_enrollment_count INTEGER;
BEGIN
    -- Obtener registro de lista de espera
    SELECT * INTO v_waitlist
    FROM public.event_waitlist
    WHERE id = p_waitlist_id AND user_id = p_user_id;
    
    IF v_waitlist IS NULL THEN
        RAISE EXCEPTION 'Registro de lista de espera no encontrado';
    END IF;
    
    -- Verificar que esté notificado y no expirado
    IF v_waitlist.status != 'notified' THEN
        RAISE EXCEPTION 'No tienes un cupo disponible aún';
    END IF;
    
    IF v_waitlist.expires_at < now() THEN
        -- Marcar como expirado
        UPDATE public.event_waitlist
        SET status = 'expired'
        WHERE id = p_waitlist_id;
        RAISE EXCEPTION 'El tiempo para inscribirte ha expirado';
    END IF;
    
    -- Obtener información del evento
    SELECT * INTO v_event
    FROM public.events
    WHERE id = v_waitlist.event_id;
    
    -- Verificar que aún hay cupo
    SELECT COUNT(*) INTO v_enrollment_count
    FROM public.event_enrollments
    WHERE event_id = v_waitlist.event_id;
    
    IF v_event.max_participants IS NOT NULL AND v_enrollment_count >= v_event.max_participants THEN
        RAISE EXCEPTION 'El cupo ya está lleno';
    END IF;
    
    -- Inscribir al usuario
    INSERT INTO public.event_enrollments (event_id, user_id)
    VALUES (v_waitlist.event_id, p_user_id)
    ON CONFLICT (event_id, user_id) DO NOTHING;
    
    -- Marcar como enrolled en lista de espera
    UPDATE public.event_waitlist
    SET status = 'enrolled'
    WHERE id = p_waitlist_id;
    
    -- Reorganizar posiciones de los que quedan esperando
    UPDATE public.event_waitlist
    SET position = position - 1
    WHERE event_id = v_waitlist.event_id
      AND position > v_waitlist.position
      AND status = 'waiting';
    
    RETURN true;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. POLÍTICAS RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.event_waitlist ENABLE ROW LEVEL SECURITY;

-- Estudiantes pueden ver su propia posición en lista de espera
DROP POLICY IF EXISTS "Users can view own waitlist" ON public.event_waitlist;
CREATE POLICY "Users can view own waitlist" ON public.event_waitlist
    FOR SELECT USING (user_id = auth.uid());

-- Estudiantes pueden unirse a lista de espera
DROP POLICY IF EXISTS "Users can join waitlist" ON public.event_waitlist;
CREATE POLICY "Users can join waitlist" ON public.event_waitlist
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Estudiantes pueden cancelar su posición en lista de espera
DROP POLICY IF EXISTS "Users can leave waitlist" ON public.event_waitlist;
CREATE POLICY "Users can leave waitlist" ON public.event_waitlist
    FOR DELETE USING (user_id = auth.uid() AND status = 'waiting');

-- Admins pueden ver y gestionar todas las listas de espera
DROP POLICY IF EXISTS "Admins can manage waitlist" ON public.event_waitlist;
CREATE POLICY "Admins can manage waitlist" ON public.event_waitlist
    FOR ALL USING (is_admin());

-- ----------------------------------------------------------------------------
-- 7. COMENTARIOS
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public.event_waitlist IS 'Lista de espera para eventos con cupo lleno';
COMMENT ON COLUMN public.event_waitlist.position IS 'Posición en la lista (1 = primero)';
COMMENT ON COLUMN public.event_waitlist.status IS 'Estado: waiting, notified, expired, enrolled';
COMMENT ON COLUMN public.event_waitlist.expires_at IS 'Fecha límite para inscribirse después de ser notificado (24 horas)';
