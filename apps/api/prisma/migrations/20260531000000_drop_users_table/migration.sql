-- Drop FK and users table; user identity is now owned by the external auth provider.
-- user_id becomes a plain TEXT column — the auth provider's opaque ID.

ALTER TABLE "checkout_sessions" DROP CONSTRAINT IF EXISTS "checkout_sessions_user_id_fkey";

ALTER TABLE "checkout_sessions" ALTER COLUMN "user_id" TYPE TEXT USING "user_id"::TEXT;

DROP TABLE IF EXISTS "users";
