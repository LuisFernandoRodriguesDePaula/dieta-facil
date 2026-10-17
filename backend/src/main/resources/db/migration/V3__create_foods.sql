CREATE TABLE foods (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(120) NOT NULL,
    unit VARCHAR(10) NOT NULL CHECK (unit IN ('G', 'KG', 'ML', 'L', 'UNIT')),
    category VARCHAR(30) NOT NULL CHECK (category IN ('PRODUCE', 'PROTEIN', 'GRAINS', 'DAIRY', 'PANTRY', 'OTHER')),
    purchase_frequency VARCHAR(10) NOT NULL CHECK (purchase_frequency IN ('WEEKLY', 'MONTHLY')),
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    UNIQUE (user_id, id)
);
CREATE INDEX foods_owner_status_name ON foods (user_id, archived_at, name);
