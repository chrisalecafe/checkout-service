-- Dev seed data — safe to re-run (ON CONFLICT DO NOTHING)
-- Password for all seed users: password123

INSERT INTO users (id, email, password) VALUES
  ('00000000-0000-0000-0000-000000000001', 'dev@example.com',   '$2b$10$j4RF8wliG28Fm7rnbU9ag.B1l3MpZ7uazhwAlbemALrViqHFzc7IO'),
  ('00000000-0000-0000-0000-000000000002', 'alice@example.com', '$2b$10$j4RF8wliG28Fm7rnbU9ag.B1l3MpZ7uazhwAlbemALrViqHFzc7IO')
ON CONFLICT DO NOTHING;

INSERT INTO checkout_sessions (id, user_id, items, subtotal, taxes, discount, total) VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '[{"name":"Widget","unit_price":50.00,"quantity":2}]',
    100.00, 13.00, 0.00, 113.00
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '[{"name":"Gadget","unit_price":75.00,"quantity":2}]',
    150.00, 19.50, 15.00, 154.50
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    '[{"name":"Doohickey","unit_price":25.00,"quantity":1},{"name":"Thingamajig","unit_price":10.00,"quantity":3}]',
    55.00, 7.15, 0.00, 62.15
  )
ON CONFLICT DO NOTHING;
