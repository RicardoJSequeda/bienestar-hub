-- ============================================================================
-- DATOS INICIALES (SEMILLAS) - BIENESTAR HUB
-- ============================================================================

-- 1. SEDES
INSERT INTO public.campuses (name, code, address) VALUES
('Universidad Cooperativa de Colombia - Sede Montería', 'UCC-MTR', 'Carrera 6 No. 66B - 14, Montería, Córdoba'),
('Universidad Cooperativa de Colombia - Sede Bogotá', 'UCC-BOG', 'Avenida Caracas No. 37 - 63, Bogotá D.C.'),
('Universidad Cooperativa de Colombia - Sede Medellín', 'UCC-MED', 'Calle 50 No. 41 - 70, Medellín, Antioquia'),
('Universidad Cooperativa de Colombia - Sede Bucaramanga', 'UCC-BGA', 'Carrera 33 No. 30 - 20, Bucaramanga, Santander'),
('Universidad Cooperativa de Colombia - Campus Virtual', 'UCC-VIR', 'Modalidad Virtual – Colombia')
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    address = EXCLUDED.address;

-- 2. PROGRAMAS ACADÉMICOS
INSERT INTO public.academic_programs (name, code, faculty) VALUES
('Ingeniería de Sistemas', 'ING-SIS', 'Facultad de Ingeniería'),
('Administración de Empresas', 'ADM-EMP', 'Facultad de Ciencias Económicas'),
('Derecho', 'DER-001', 'Facultad de Derecho'),
('Psicología', 'PSI-001', 'Facultad de Psicología'),
('Contaduría Pública', 'CON-PUB', 'Facultad de Ciencias Económicas'),
('Enfermería', 'ENF-001', 'Facultad de Ciencias de la Salud'),
('Licenciatura en Educación Física', 'LEF-001', 'Facultad de Educación')
ON CONFLICT (name) DO UPDATE SET 
    code = EXCLUDED.code,
    faculty = EXCLUDED.faculty;

-- 3. CATEGORÍAS DE RECURSOS
INSERT INTO public.resource_categories (name, icon, base_wellness_hours, max_loan_days, requires_approval) VALUES
('Deporte y Recreación', 'Dribbble', 2.0, 3, false),
('Cultura y Arte', 'Music', 2.5, 5, false),
('Tecnología Educativa', 'Laptop', 3.0, 7, true),
('Instrumentos Musicales', 'Mic', 3.5, 5, true),
('Juegos de Mesa', 'Gamepad', 1.5, 2, false)
ON CONFLICT (name) DO UPDATE SET 
    base_wellness_hours = EXCLUDED.base_wellness_hours,
    max_loan_days = EXCLUDED.max_loan_days,
    requires_approval = EXCLUDED.requires_approval;

-- 4. CONFIGURACIÓN DEL SISTEMA
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

-- 5. RECURSOS FÍSICOS (INVENTARIO)
DO $$
DECLARE
    cat_deporte UUID;
    cat_musica UUID;
    cat_juegos UUID;
    cat_tec UUID;
    sede_mtr UUID;
BEGIN
    SELECT id INTO cat_deporte FROM public.resource_categories WHERE name = 'Deporte y Recreación' LIMIT 1;
    SELECT id INTO cat_musica FROM public.resource_categories WHERE name = 'Instrumentos Musicales' LIMIT 1;
    SELECT id INTO cat_juegos FROM public.resource_categories WHERE name = 'Juegos de Mesa' LIMIT 1;
    SELECT id INTO cat_tec FROM public.resource_categories WHERE name = 'Tecnología Educativa' LIMIT 1;
    SELECT id INTO sede_mtr FROM public.campuses WHERE code = 'UCC-MTR' LIMIT 1;

    INSERT INTO public.resources (category_id, campus_id, name, serial_number, condition_notes) VALUES
    (cat_deporte, sede_mtr, 'Balón de Fútbol Profesional', 'DEP-FUT-001', 'Balón oficial en buen estado'),
    (cat_musica, sede_mtr, 'Guitarra Acústica Yamaha', 'MUS-GUI-002', 'Incluye estuche y cuerdas nuevas'),
    (cat_juegos, sede_mtr, 'Ajedrez Profesional', 'JUE-AJE-003', 'Tablero completo con piezas reglamentarias'),
    (cat_tec, sede_mtr, 'Video Beam Epson X200', 'TEC-VB-004', 'Resolución HD, uso académico')
    ON CONFLICT (serial_number) DO NOTHING;
END $$;

-- 6. CATEGORÍAS DE EVENTOS
INSERT INTO public.event_categories (name) VALUES
('Actividad Deportiva'),
('Evento Cultural'),
('Salud Mental'),
('Integración Universitaria'),
('Responsabilidad Social')
ON CONFLICT (name) DO NOTHING;

-- 7. EVENTOS
DO $$
DECLARE
    sede_mtr UUID;
    cat_deportiva UUID;
    cat_salud UUID;
BEGIN
    SELECT id INTO sede_mtr FROM public.campuses WHERE code = 'UCC-MTR' LIMIT 1;
    SELECT id INTO cat_deportiva FROM public.event_categories WHERE name = 'Actividad Deportiva' LIMIT 1;
    SELECT id INTO cat_salud FROM public.event_categories WHERE name = 'Salud Mental' LIMIT 1;

    INSERT INTO public.events (title, description, location, max_participants, start_date, end_date, wellness_hours, category_id, campus_id) VALUES
    ('Torneo Interprogramas de Fútbol Sala', 'Actividad deportiva organizada por Bienestar Universitario UCC Montería', 'Cancha Múltiple – Campus Montería', 120, now() + interval '7 days', now() + interval '7 days' + interval '4 hours', 2.5, cat_deportiva, sede_mtr),
    ('Jornada de Bienestar Emocional', 'Espacio de orientación psicológica y autocuidado para estudiantes', 'Auditorio Principal – UCC Montería', 80, now() + interval '14 days', now() + interval '14 days' + interval '3 hours', 3.0, cat_salud, sede_mtr)
    ON CONFLICT DO NOTHING;
END $$;

-- 8. POLÍTICAS INSTITUCIONALES
INSERT INTO public.institutional_policies (title, slug, content, version) VALUES
('Política de Préstamo de Recursos de Bienestar', 'politica-prestamo-bienestar', 'Regula el uso responsable de los recursos físicos asignados por Bienestar Universitario. El estudiante será responsable por pérdida o daño.', '1.0'),
('Política de Participación en Eventos de Bienestar', 'politica-eventos-bienestar', 'La participación en eventos de bienestar otorga horas válidas para el cumplimiento del requisito institucional.', '1.0'),
('Régimen de Convivencia y Uso de Recursos', 'regimen-convivencia-recursos', 'El uso indebido de recursos podrá acarrear sanciones académicas o administrativas.', '1.0')
ON CONFLICT (slug) DO UPDATE SET 
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    version = EXCLUDED.version;

-- 9. RECURSOS ADICIONALES CON IMÁGENES
INSERT INTO resource_categories (name, icon, base_wellness_hours, hourly_factor, is_low_risk, requires_approval, max_loan_days)
VALUES 
('Deporte y Recreación', 'trophy', 2, 0, true, false, 1),
('Juegos de Mesa', 'dice-5', 1.5, 0, true, false, 1)
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  sport_id uuid;
  game_id uuid;
BEGIN
  SELECT id INTO sport_id FROM resource_categories WHERE name = 'Deporte y Recreación' LIMIT 1;
  SELECT id INTO game_id FROM resource_categories WHERE name = 'Juegos de Mesa' LIMIT 1;

  INSERT INTO resources (name, description, status, category_id, image_url)
  VALUES
  ('Balón de Fútbol Profesional', 'Balón oficial de fútbol talla 5, alta resistencia.', 'available', sport_id, 'https://images.unsplash.com/photo-1614632537229-37e1750e334a?q=80&w=2000'),
  ('Balón de Voleibol Mikasa', 'Balón de voleibol profesional, tacto suave.', 'available', sport_id, 'https://images.unsplash.com/photo-1592656094267-764a45160876?q=80&w=2000'),
  ('Balón de Baloncesto Spalding', 'Balón de baloncesto #7, agarre profesional.', 'available', sport_id, 'https://images.unsplash.com/photo-1519861531473-9200262188be?q=80&w=2000'),
  ('Raquetas de Ping Pong (Set)', 'Set de 2 raquetas profesionales y 3 bolas.', 'available', sport_id, 'https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?q=80&w=2000');

  INSERT INTO resources (name, description, status, category_id, image_url)
  VALUES
  ('Monopoly Clásico', 'El juego de compraventa de propiedades.', 'available', game_id, 'https://images.unsplash.com/photo-1611371805429-062e24d26210?q=80&w=2000'),
  ('Juego Uno', 'Juego de cartas familiar.', 'available', game_id, 'https://images.unsplash.com/photo-1605389429457-3765108ce8ba?q=80&w=2000'),
  ('Ajedrez Profesional', 'Tablero de madera y piezas pesadas.', 'available', game_id, 'https://images.unsplash.com/photo-1586165368502-1bad197a6461?q=80&w=2000'),
  ('Dominó Doble 6', 'Juego de dominó clásico en caja de madera.', 'available', game_id, 'https://images.unsplash.com/photo-1566694271453-390536dd1f0d?q=80&w=2000');
END $$;

-- ============================================================================
-- FIN – DATOS INICIALES
-- ============================================================================
