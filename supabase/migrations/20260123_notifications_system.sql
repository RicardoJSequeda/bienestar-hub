-- ============================================================================
-- SISTEMA DE NOTIFICACIONES DE PRÉSTAMOS
-- ============================================================================
-- Este script crea la infraestructura completa para notificaciones en tiempo real

-- ----------------------------------------------------------------------------
-- 1. TABLA DE NOTIFICACIONES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'loan_request', 'loan_approved', 'loan_rejected', etc.
  title TEXT NOT NULL,
  message TEXT,
  link TEXT, -- URL para navegar al hacer click
  data JSONB, -- Datos adicionales flexibles
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para consultas rápidas de notificaciones no leídas
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications(user_id, read) 
WHERE read = false;

-- Índice general por usuario y fecha
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON public.notifications(user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. TRIGGER: NOTIFICAR ADMINS EN NUEVA SOLICITUD
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_admins_new_loan()
RETURNS TRIGGER AS $$
DECLARE
  admin_ids UUID[];
  student_name TEXT;
  resource_name TEXT;
BEGIN
  -- Solo si es una nueva solicitud pendiente
  IF NEW.status = 'pending' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'pending') THEN
    -- Obtener todos los admins y coordinadores
    SELECT ARRAY_AGG(user_id) INTO admin_ids
    FROM user_roles
    WHERE role IN ('admin', 'coordinator');

    -- Obtener nombres para el mensaje
    SELECT full_name INTO student_name 
    FROM profiles 
    WHERE user_id = NEW.user_id;

    SELECT name INTO resource_name 
    FROM resources 
    WHERE id = NEW.resource_id;

    -- Crear notificación para cada admin
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

-- Trigger en INSERT y UPDATE
DROP TRIGGER IF EXISTS on_loan_request ON public.loans;
CREATE TRIGGER on_loan_request
AFTER INSERT OR UPDATE ON public.loans
FOR EACH ROW
EXECUTE FUNCTION notify_admins_new_loan();

-- ----------------------------------------------------------------------------
-- 3. TRIGGER: MARCAR COMO LEÍDA AL PROCESAR
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION mark_loan_notification_read()
RETURNS TRIGGER AS $$
BEGIN
  -- Si cambió de pending a otro estado
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

-- ----------------------------------------------------------------------------
-- 4. POLÍTICAS RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Usuarios solo ven sus propias notificaciones
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

-- Usuarios pueden marcar sus notificaciones como leídas
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 5. VERIFICACIÓN
-- ----------------------------------------------------------------------------
-- Consulta para verificar que todo funciona
SELECT 
  n.id,
  n.type,
  n.title,
  n.message,
  n.read,
  n.created_at,
  p.full_name as for_user
FROM notifications n
JOIN profiles p ON p.user_id = n.user_id
ORDER BY n.created_at DESC
LIMIT 10;

-- Verificar índices
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'notifications';
