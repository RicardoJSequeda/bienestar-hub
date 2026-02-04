-- ============================================================================
-- DATOS DE PRUEBA MASIVOS - BIENESTAR HUB
-- ============================================================================
-- NOTA: Este archivo es SOLO para pruebas. Eliminar antes de producción.
-- Ejecutar en Supabase SQL Editor después del esquema y datos iniciales.
-- ============================================================================

-- ============================================================================
-- 1. USUARIOS DE PRUEBA
-- ============================================================================
-- NOTA: Primero debes crear estos usuarios en Supabase Auth (Authentication > Users)
-- con los siguientes emails. El trigger creará automáticamente los profiles.
-- 
-- ADMINISTRADORES:
--   admin@ucc.edu.co (contraseña: Admin123!)
--   coordinador@ucc.edu.co (contraseña: Coord123!)
--
-- ESTUDIANTES:
--   estudiante1@ucc.edu.co hasta estudiante20@ucc.edu.co (contraseña: Test123!)
--
-- Una vez creados los usuarios en Auth, ejecuta este script para asignar roles
-- y crear datos adicionales.
-- ============================================================================

-- Función helper para obtener user_id por email
CREATE OR REPLACE FUNCTION get_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
    SELECT id FROM auth.users WHERE email = p_email LIMIT 1;
$$;

-- ============================================================================
-- 2. ASIGNAR ROLES A USUARIOS (ejecutar después de crear usuarios en Auth)
-- ============================================================================
DO $$
DECLARE
    admin_id UUID;
    coord_id UUID;
    i INTEGER;
    student_email TEXT;
    student_id UUID;
BEGIN
    -- Buscar admin
    SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@ucc.edu.co' LIMIT 1;
    IF admin_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role) VALUES (admin_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Actualizar perfil del admin
        UPDATE public.profiles SET 
            full_name = 'Administrador Sistema',
            student_code = NULL,
            phone = '3001234567'
        WHERE user_id = admin_id;
    END IF;

    -- Buscar coordinador
    SELECT id INTO coord_id FROM auth.users WHERE email = 'coordinador@ucc.edu.co' LIMIT 1;
    IF coord_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role) VALUES (coord_id, 'coordinator')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        UPDATE public.profiles SET 
            full_name = 'Coordinador Bienestar',
            student_code = NULL,
            phone = '3009876543'
        WHERE user_id = coord_id;
    END IF;

    -- Asignar datos a estudiantes de prueba
    FOR i IN 1..20 LOOP
        student_email := 'estudiante' || i || '@ucc.edu.co';
        SELECT id INTO student_id FROM auth.users WHERE email = student_email LIMIT 1;
        
        IF student_id IS NOT NULL THEN
            -- Actualizar perfil del estudiante
            UPDATE public.profiles SET 
                full_name = 'Estudiante Prueba ' || i,
                student_code = '2024' || LPAD(i::text, 4, '0'),
                phone = '300' || LPAD((1000000 + i)::text, 7, '0')
            WHERE user_id = student_id;
            
            -- Asignar puntaje de confianza variado
            UPDATE public.student_behavioral_status SET 
                trust_score = 80 + (i * 5) % 60  -- Valores entre 80 y 140
            WHERE user_id = student_id;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- 3. RECURSOS ADICIONALES (usando categorías existentes)
-- ============================================================================
DO $$
DECLARE
    cat_deporte UUID;
    cat_musica UUID;
    cat_juegos UUID;
    cat_tec UUID;
    sede_mtr UUID;
BEGIN
    -- Obtener IDs de categorías existentes
    SELECT id INTO cat_deporte FROM public.resource_categories WHERE name = 'Deporte y Recreación' LIMIT 1;
    SELECT id INTO cat_musica FROM public.resource_categories WHERE name = 'Instrumentos Musicales' LIMIT 1;
    SELECT id INTO cat_juegos FROM public.resource_categories WHERE name = 'Juegos de Mesa' LIMIT 1;
    SELECT id INTO cat_tec FROM public.resource_categories WHERE name = 'Tecnología Educativa' LIMIT 1;
    SELECT id INTO sede_mtr FROM public.campuses WHERE code = 'UCC-MTR' LIMIT 1;

    -- DEPORTES (10 recursos adicionales)
    INSERT INTO public.resources (category_id, campus_id, name, description, serial_number, status, image_url) VALUES
    (cat_deporte, sede_mtr, 'Balón de Fútbol Nike Strike', 'Balón profesional talla 5', 'DEP-FUT-010', 'available', 'https://images.unsplash.com/photo-1614632537229-37e1750e334a?w=800'),
    (cat_deporte, sede_mtr, 'Balón de Fútbol Adidas', 'Balón Champions replica', 'DEP-FUT-011', 'available', 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800'),
    (cat_deporte, sede_mtr, 'Balón de Voleibol Molten', 'Balón oficial FIVB', 'DEP-VOL-010', 'available', 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800'),
    (cat_deporte, sede_mtr, 'Balón de Baloncesto Wilson', 'Balón NBA talla 7', 'DEP-BAS-010', 'available', 'https://images.unsplash.com/photo-1519861531473-9200262188be?w=800'),
    (cat_deporte, sede_mtr, 'Raquetas de Tenis (Par)', '2 raquetas profesionales', 'DEP-TEN-010', 'available', 'https://images.unsplash.com/photo-1617083934555-ac7d4a2e2889?w=800'),
    (cat_deporte, sede_mtr, 'Set de Bádminton', '4 raquetas + gallitos + red', 'DEP-BAD-010', 'available', 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800'),
    (cat_deporte, sede_mtr, 'Conos de Entrenamiento (20)', 'Conos para práctica', 'DEP-CON-010', 'available', 'https://images.unsplash.com/photo-1461896836934-bc4922eedec3?w=800'),
    (cat_deporte, sede_mtr, 'Cuerdas para Saltar (5)', 'Cuerdas profesionales', 'DEP-SAL-010', 'available', 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=800'),
    (cat_deporte, sede_mtr, 'Colchonetas de Ejercicio (10)', 'Colchonetas yoga', 'DEP-COL-010', 'available', 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800'),
    (cat_deporte, sede_mtr, 'Bandas Elásticas Set', 'Set de 5 resistencias', 'DEP-BAN-010', 'available', 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800')
    ON CONFLICT (serial_number) DO NOTHING;

    -- INSTRUMENTOS MUSICALES (6 recursos adicionales)
    INSERT INTO public.resources (category_id, campus_id, name, description, serial_number, status, image_url) VALUES
    (cat_musica, sede_mtr, 'Guitarra Clásica Yamaha C40', 'Guitarra principiantes', 'MUS-GUI-010', 'available', 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800'),
    (cat_musica, sede_mtr, 'Guitarra Eléctrica Fender', 'Stratocaster Mexican', 'MUS-GUI-011', 'available', 'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?w=800'),
    (cat_musica, sede_mtr, 'Teclado Yamaha PSR-E373', 'Teclado 61 teclas', 'MUS-TEC-010', 'available', 'https://images.unsplash.com/photo-1552422535-c45813c61732?w=800'),
    (cat_musica, sede_mtr, 'Ukulele Mahalo Soprano', 'Ukulele principiantes', 'MUS-UKU-010', 'available', 'https://images.unsplash.com/photo-1556449895-a33c9dba33dd?w=800'),
    (cat_musica, sede_mtr, 'Cajón Peruano LP', 'Cajón flamenco', 'MUS-CAJ-010', 'available', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800'),
    (cat_musica, sede_mtr, 'Bongos Profesionales', 'Bongos de cuero', 'MUS-BON-010', 'available', 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800')
    ON CONFLICT (serial_number) DO NOTHING;

    -- JUEGOS DE MESA (8 recursos adicionales)
    INSERT INTO public.resources (category_id, campus_id, name, description, serial_number, status, image_url) VALUES
    (cat_juegos, sede_mtr, 'Risk Edición Clásica', 'Juego de estrategia', 'JUE-RIS-010', 'available', 'https://images.unsplash.com/photo-1632501641765-e568d28b0015?w=800'),
    (cat_juegos, sede_mtr, 'Catán Edición Base', 'Colonizadores de Catán', 'JUE-CAT-010', 'available', 'https://images.unsplash.com/photo-1611371805429-062e24d26210?w=800'),
    (cat_juegos, sede_mtr, 'Scrabble en Español', 'Juego de palabras', 'JUE-SCR-010', 'available', 'https://images.unsplash.com/photo-1585504198199-20277593b94f?w=800'),
    (cat_juegos, sede_mtr, 'Jenga Clásico', 'Torre de bloques', 'JUE-JEN-010', 'available', 'https://images.unsplash.com/photo-1563901935883-cb61f5d49be4?w=800'),
    (cat_juegos, sede_mtr, 'Pictionary', 'Juego de dibujo', 'JUE-PIC-010', 'available', 'https://images.unsplash.com/photo-1606503153255-59d7d5a88e4c?w=800'),
    (cat_juegos, sede_mtr, 'Dominó Doble 9', 'Set profesional 55 fichas', 'JUE-DOM-010', 'available', 'https://images.unsplash.com/photo-1566694271453-390536dd1f0d?w=800'),
    (cat_juegos, sede_mtr, 'Parqués Gigante', 'Tablero grande 6 jugadores', 'JUE-PAR-010', 'available', 'https://images.unsplash.com/photo-1632501641765-e568d28b0015?w=800'),
    (cat_juegos, sede_mtr, 'Cartas UNO (3 mazos)', 'Juego de cartas', 'JUE-UNO-010', 'available', 'https://images.unsplash.com/photo-1605389429457-3765108ce8ba?w=800')
    ON CONFLICT (serial_number) DO NOTHING;

    -- TECNOLOGÍA (5 recursos adicionales)
    INSERT INTO public.resources (category_id, campus_id, name, description, serial_number, status, image_url) VALUES
    (cat_tec, sede_mtr, 'Proyector Epson PowerLite', 'Proyector 3600 lúmenes', 'TEC-PRO-010', 'available', 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800'),
    (cat_tec, sede_mtr, 'Cámara Canon EOS Rebel', 'DSLR con lente 18-55mm', 'TEC-CAM-010', 'available', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800'),
    (cat_tec, sede_mtr, 'Micrófono Blue Yeti', 'Micrófono USB profesional', 'TEC-MIC-010', 'available', 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800'),
    (cat_tec, sede_mtr, 'Ring Light 18 pulgadas', 'Aro de luz LED con trípode', 'TEC-LUZ-010', 'available', 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800'),
    (cat_tec, sede_mtr, 'Trípode Profesional', 'Trípode para cámara/celular', 'TEC-TRI-010', 'available', 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=800')
    ON CONFLICT (serial_number) DO NOTHING;

END $$;

-- ============================================================================
-- 4. EVENTOS ADICIONALES (usando categorías existentes)
-- ============================================================================
DO $$
DECLARE
    sede_mtr UUID;
    cat_deportiva UUID;
    cat_salud UUID;
    cat_cultural UUID;
    cat_integracion UUID;
    cat_social UUID;
BEGIN
    SELECT id INTO sede_mtr FROM public.campuses WHERE code = 'UCC-MTR' LIMIT 1;
    SELECT id INTO cat_deportiva FROM public.event_categories WHERE name = 'Actividad Deportiva' LIMIT 1;
    SELECT id INTO cat_salud FROM public.event_categories WHERE name = 'Salud Mental' LIMIT 1;
    SELECT id INTO cat_cultural FROM public.event_categories WHERE name = 'Evento Cultural' LIMIT 1;
    SELECT id INTO cat_integracion FROM public.event_categories WHERE name = 'Integración Universitaria' LIMIT 1;
    SELECT id INTO cat_social FROM public.event_categories WHERE name = 'Responsabilidad Social' LIMIT 1;

    -- Eventos futuros
    INSERT INTO public.events (title, description, location, max_participants, start_date, end_date, wellness_hours, category_id, campus_id, is_active, image_url) VALUES
    
    -- DEPORTIVOS
    ('Torneo Relámpago de Fútbol Sala', 'Competencia entre facultades', 'Cancha Múltiple', 80, now() + interval '3 days', now() + interval '3 days' + interval '5 hours', 3.0, cat_deportiva, sede_mtr, true, 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800'),
    ('Maratón 5K UCC', 'Carrera atlética universitaria', 'Campus Principal', 200, now() + interval '10 days', now() + interval '10 days' + interval '4 hours', 4.0, cat_deportiva, sede_mtr, true, 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800'),
    ('Torneo de Voleibol Mixto', 'Equipos mixtos de 6 jugadores', 'Coliseo UCC', 60, now() + interval '15 days', now() + interval '15 days' + interval '6 hours', 3.5, cat_deportiva, sede_mtr, true, 'https://images.unsplash.com/photo-1592656094267-764a45160876?w=800'),
    ('Campeonato de Ping Pong', 'Individual y dobles', 'Cafetería Principal', 32, now() + interval '25 days', now() + interval '25 days' + interval '5 hours', 2.5, cat_deportiva, sede_mtr, true, 'https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?w=800'),

    -- SALUD MENTAL
    ('Taller de Manejo del Estrés', 'Técnicas de relajación y mindfulness', 'Sala de Conferencias A', 50, now() + interval '5 days', now() + interval '5 days' + interval '3 hours', 3.0, cat_salud, sede_mtr, true, 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800'),
    ('Yoga al Aire Libre', 'Sesión grupal de yoga', 'Jardín Central', 30, now() + interval '7 days', now() + interval '7 days' + interval '2 hours', 2.0, cat_salud, sede_mtr, true, 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800'),
    ('Charla: Inteligencia Emocional', 'Conferencia con psicólogo experto', 'Auditorio Principal', 150, now() + interval '12 days', now() + interval '12 days' + interval '2 hours', 2.5, cat_salud, sede_mtr, true, 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800'),
    ('Meditación Guiada', 'Sesión de meditación para principiantes', 'Sala Bienestar', 25, now() + interval '18 days', now() + interval '18 days' + interval '1.5 hours', 1.5, cat_salud, sede_mtr, true, 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800'),

    -- CULTURALES
    ('Noche de Talentos UCC', 'Muestra artística estudiantil', 'Auditorio Principal', 200, now() + interval '8 days', now() + interval '8 days' + interval '4 hours', 3.0, cat_cultural, sede_mtr, true, 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800'),
    ('Concierto Acústico', 'Bandas estudiantiles en vivo', 'Plazoleta Central', 300, now() + interval '14 days', now() + interval '14 days' + interval '5 hours', 3.5, cat_cultural, sede_mtr, true, 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800'),
    ('Club de Lectura', 'Discusión literaria mensual', 'Biblioteca', 20, now() + interval '9 days', now() + interval '9 days' + interval '2 hours', 2.0, cat_cultural, sede_mtr, true, 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800'),

    -- INTEGRACIÓN
    ('Bienvenida Primer Semestre', 'Evento de inducción para nuevos', 'Auditorio Principal', 400, now() + interval '2 days', now() + interval '2 days' + interval '5 hours', 4.0, cat_integracion, sede_mtr, true, 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'),
    ('Picnic Universitario', 'Tarde de juegos y comida', 'Zona Verde', 150, now() + interval '16 days', now() + interval '16 days' + interval '4 hours', 2.5, cat_integracion, sede_mtr, true, 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800'),
    ('Noche de Juegos de Mesa', 'Competencias amistosas', 'Sala Multiusos', 60, now() + interval '11 days', now() + interval '11 days' + interval '4 hours', 2.0, cat_integracion, sede_mtr, true, 'https://images.unsplash.com/photo-1611371805429-062e24d26210?w=800'),

    -- RESPONSABILIDAD SOCIAL
    ('Jornada de Limpieza Ambiental', 'Voluntariado ambiental', 'Río Sinú', 50, now() + interval '6 days', now() + interval '6 days' + interval '5 hours', 5.0, cat_social, sede_mtr, true, 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800'),
    ('Donación de Sangre UCC', 'Jornada de donación voluntaria', 'Enfermería Campus', 100, now() + interval '17 days', now() + interval '17 days' + interval '8 hours', 3.0, cat_social, sede_mtr, true, 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800'),
    ('Siembra de Árboles', 'Reforestación comunitaria', 'Parque Municipal', 40, now() + interval '24 days', now() + interval '24 days' + interval '4 hours', 4.0, cat_social, sede_mtr, true, 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800')

    ON CONFLICT DO NOTHING;

    -- Eventos pasados (para historial)
    INSERT INTO public.events (title, description, location, max_participants, start_date, end_date, wellness_hours, category_id, campus_id, is_active, image_url) VALUES
    ('Torneo de Ajedrez - Finalizado', 'Torneo completado', 'Biblioteca', 32, now() - interval '15 days', now() - interval '15 days' + interval '5 hours', 2.5, cat_cultural, sede_mtr, false, 'https://images.unsplash.com/photo-1586165368502-1bad197a6461?w=800'),
    ('Taller de Respiración - Finalizado', 'Taller completado', 'Sala Bienestar', 25, now() - interval '10 days', now() - interval '10 days' + interval '2 hours', 2.0, cat_salud, sede_mtr, false, 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800'),
    ('Festival de la Canción - Finalizado', 'Festival terminado', 'Auditorio', 200, now() - interval '5 days', now() - interval '5 days' + interval '4 hours', 3.0, cat_cultural, sede_mtr, false, 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800')
    ON CONFLICT DO NOTHING;

END $$;

-- ============================================================================
-- 5. PRÉSTAMOS DE PRUEBA (requiere usuarios existentes)
-- ============================================================================
DO $$
DECLARE
    student_id UUID;
    resource_id UUID;
    i INTEGER;
BEGIN
    -- Crear préstamos para estudiantes existentes
    FOR i IN 1..5 LOOP
        SELECT id INTO student_id FROM auth.users WHERE email = 'estudiante' || i || '@ucc.edu.co' LIMIT 1;
        
        IF student_id IS NOT NULL THEN
            -- Obtener un recurso disponible aleatorio
            SELECT id INTO resource_id FROM public.resources 
            WHERE status = 'available' 
            ORDER BY random() LIMIT 1;
            
            IF resource_id IS NOT NULL THEN
                -- Crear préstamo pendiente
                INSERT INTO public.loans (user_id, resource_id, status, requested_at)
                VALUES (student_id, resource_id, 'pending', now() - interval '1 hour')
                ON CONFLICT DO NOTHING;
            END IF;
        END IF;
    END LOOP;

    -- Crear algunos préstamos activos
    FOR i IN 6..10 LOOP
        SELECT id INTO student_id FROM auth.users WHERE email = 'estudiante' || i || '@ucc.edu.co' LIMIT 1;
        
        IF student_id IS NOT NULL THEN
            SELECT id INTO resource_id FROM public.resources 
            WHERE status = 'available' 
            ORDER BY random() LIMIT 1;
            
            IF resource_id IS NOT NULL THEN
                INSERT INTO public.loans (user_id, resource_id, status, requested_at, approved_at, due_date)
                VALUES (
                    student_id, 
                    resource_id, 
                    'active', 
                    now() - interval '2 days',
                    now() - interval '2 days',
                    now() + interval '5 days'
                )
                ON CONFLICT DO NOTHING;
                
                -- Marcar recurso como prestado
                UPDATE public.resources SET status = 'borrowed' WHERE id = resource_id;
            END IF;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- 6. INSCRIPCIONES A EVENTOS DE PRUEBA
-- ============================================================================
DO $$
DECLARE
    student_id UUID;
    event_id UUID;
    i INTEGER;
BEGIN
    -- Inscribir estudiantes en eventos futuros
    FOR i IN 1..15 LOOP
        SELECT id INTO student_id FROM auth.users WHERE email = 'estudiante' || i || '@ucc.edu.co' LIMIT 1;
        
        IF student_id IS NOT NULL THEN
            -- Inscribir en 2-3 eventos aleatorios
            FOR event_id IN (SELECT id FROM public.events WHERE is_active = true ORDER BY random() LIMIT 3) LOOP
                INSERT INTO public.event_enrollments (event_id, user_id, attended)
                VALUES (event_id, student_id, false)
                ON CONFLICT (event_id, user_id) DO NOTHING;
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- 7. HORAS DE BIENESTAR DE PRUEBA
-- ============================================================================
DO $$
DECLARE
    student_id UUID;
    admin_id UUID;
    i INTEGER;
BEGIN
    SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@ucc.edu.co' LIMIT 1;
    
    -- Asignar horas a algunos estudiantes
    FOR i IN 1..12 LOOP
        SELECT id INTO student_id FROM auth.users WHERE email = 'estudiante' || i || '@ucc.edu.co' LIMIT 1;
        
        IF student_id IS NOT NULL THEN
            INSERT INTO public.wellness_hours (user_id, hours, source_type, description, awarded_by)
            VALUES 
            (student_id, 2.5, 'event', 'Participación en Torneo de Ajedrez', admin_id),
            (student_id, 3.0, 'loan', 'Préstamo de recurso deportivo', admin_id),
            (student_id, 2.0, 'event', 'Taller de Respiración', admin_id)
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- 8. NOTIFICACIONES DE PRUEBA
-- ============================================================================
DO $$
DECLARE
    student_id UUID;
    admin_id UUID;
    i INTEGER;
BEGIN
    SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@ucc.edu.co' LIMIT 1;
    
    -- Notificaciones para admin
    IF admin_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, read) VALUES
        (admin_id, 'loan_request', 'Nueva solicitud de préstamo', 'Estudiante Prueba 1 solicita Balón de Fútbol', false),
        (admin_id, 'loan_request', 'Nueva solicitud de préstamo', 'Estudiante Prueba 2 solicita Guitarra Clásica', false),
        (admin_id, 'system', 'Reporte semanal listo', 'El reporte de préstamos de la semana está disponible', true)
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- Notificaciones para estudiantes
    FOR i IN 1..5 LOOP
        SELECT id INTO student_id FROM auth.users WHERE email = 'estudiante' || i || '@ucc.edu.co' LIMIT 1;
        
        IF student_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, type, title, message, read) VALUES
            (student_id, 'event_reminder', 'Evento próximo', 'Recuerda que mañana es el Torneo de Fútbol Sala', false),
            (student_id, 'loan_approved', 'Préstamo aprobado', 'Tu solicitud de préstamo fue aprobada', true)
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- LIMPIEZA DE FUNCIÓN HELPER
-- ============================================================================
DROP FUNCTION IF EXISTS get_user_id_by_email(TEXT);

-- ============================================================================
-- FIN - DATOS DE PRUEBA
-- ============================================================================
-- IMPORTANTE: 
-- 1. Primero crea los usuarios en Supabase Auth (Authentication > Users)
-- 2. Luego ejecuta este script
-- 3. Eliminar este archivo antes de producción
-- ============================================================================
