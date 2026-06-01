-- CreateTable
CREATE TABLE "checkout_sessions" (
    "id"         UUID          NOT NULL DEFAULT gen_random_uuid(),
    "user_id"    TEXT          NOT NULL,
    "items"      JSONB         NOT NULL,
    "subtotal"   DECIMAL(12,2) NOT NULL,
    "taxes"      DECIMAL(12,2) NOT NULL,
    "discount"   DECIMAL(12,2) NOT NULL,
    "total"      DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id")
);
