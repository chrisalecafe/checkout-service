CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checkout_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  items      JSONB NOT NULL,
  subtotal   NUMERIC(12,2) NOT NULL,
  taxes      NUMERIC(12,2) NOT NULL,
  discount   NUMERIC(12,2) NOT NULL,
  total      NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
