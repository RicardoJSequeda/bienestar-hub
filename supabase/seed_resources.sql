
-- Insert Categories if not exist
INSERT INTO resource_categories (name, icon, base_wellness_hours, hourly_factor, is_low_risk, requires_approval, max_loan_days)
VALUES 
('Deporte y Recreación', 'trophy', 2, 0, true, false, 1),
('Juegos de Mesa', 'dice-5', 1.5, 0, true, false, 1)
ON CONFLICT DO NOTHING;

-- Get Category IDs
DO $$
DECLARE
  sport_id uuid;
  game_id uuid;
BEGIN
  SELECT id INTO sport_id FROM resource_categories WHERE name = 'Deporte y Recreación' LIMIT 1;
  SELECT id INTO game_id FROM resource_categories WHERE name = 'Juegos de Mesa' LIMIT 1;

  -- Insert Balls
  INSERT INTO resources (name, description, status, category_id, image_url)
  VALUES
  ('Balón de Fútbol Profesional', 'Balón oficial de fútbol talla 5, alta resistencia.', 'available', sport_id, 'https://images.unsplash.com/photo-1614632537229-37e1750e334a?q=80&w=2000'),
  ('Balón de Voleibol Mikasa', 'Balón de voleibol profesional, tacto suave.', 'available', sport_id, 'https://images.unsplash.com/photo-1592656094267-764a45160876?q=80&w=2000'),
  ('Balón de Baloncesto Spalding', 'Balón de baloncesto #7, agarre profesional.', 'available', sport_id, 'https://images.unsplash.com/photo-1519861531473-9200262188be?q=80&w=2000'),
  ('Raquetas de Ping Pong (Set)', 'Set de 2 raquetas profesionales y 3 bolas.', 'available', sport_id, 'https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?q=80&w=2000');

  -- Insert Board Games
  INSERT INTO resources (name, description, status, category_id, image_url)
  VALUES
  ('Monopoly Clásico', 'El juego de compraventa de propiedades.', 'available', game_id, 'https://images.unsplash.com/photo-1611371805429-062e24d26210?q=80&w=2000'),
  ('Juego Uno', 'Juego de cartas familiar.', 'available', game_id, 'https://images.unsplash.com/photo-1605389429457-3765108ce8ba?q=80&w=2000'),
  ('Ajedrez Profesional', 'Tablero de madera y piezas pesadas.', 'available', game_id, 'https://images.unsplash.com/photo-1586165368502-1bad197a6461?q=80&w=2000'),
  ('Dominó Doble 6', 'Juego de dominó clásico en caja de madera.', 'available', game_id, 'https://images.unsplash.com/photo-1566694271453-390536dd1f0d?q=80&w=2000');
  
END $$;
