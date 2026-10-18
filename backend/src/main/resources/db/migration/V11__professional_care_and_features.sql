ALTER TABLE users ADD COLUMN account_role VARCHAR(20) NOT NULL DEFAULT 'CLIENT';
ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(10) NOT NULL DEFAULT 'BASIC';
ALTER TABLE users ADD COLUMN inventory_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN inventory_review_required BOOLEAN NOT NULL DEFAULT TRUE;
-- Preserve access and balances for existing accounts; new accounts start on Basic.
UPDATE users SET subscription_tier='PREMIUM',inventory_enabled=TRUE,inventory_review_required=FALSE;
CREATE TABLE professional_links (
 id UUID PRIMARY KEY, professional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 client_id UUID REFERENCES users(id) ON DELETE CASCADE,
 recipient_email VARCHAR(254) NOT NULL, display_name VARCHAR(100) NOT NULL,
 status VARCHAR(10) NOT NULL CHECK(status IN ('PENDING','ACTIVE','REVOKED')),
 expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
 UNIQUE(professional_id,recipient_email)
);
CREATE INDEX links_recipient ON professional_links(recipient_email,status);
CREATE TABLE care_evaluations (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 author_id UUID REFERENCES users(id) ON DELETE SET NULL, author_name VARCHAR(100) NOT NULL,
 observed_on DATE NOT NULL, month_date DATE NOT NULL, version BIGINT NOT NULL,
 weight NUMERIC(6,2) NOT NULL, height NUMERIC(5,2), waist NUMERIC(5,2),
 goal VARCHAR(500) NOT NULL, notes VARCHAR(2000) NOT NULL,
 UNIQUE(user_id,month_date)
);
CREATE TABLE meal_checkins (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 occurrence_id UUID NOT NULL, request TEXT NOT NULL, mode VARCHAR(10) NOT NULL,
 operation_id UUID, undone BOOLEAN NOT NULL DEFAULT FALSE
);
