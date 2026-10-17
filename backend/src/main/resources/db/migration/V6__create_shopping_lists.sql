CREATE TABLE shopping_lists (
 id UUID PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id),
 from_date DATE NOT NULL,until_date DATE NOT NULL,
 source_hash VARCHAR(64) NOT NULL,snapshot_json TEXT NOT NULL,
 adjustments_json TEXT NOT NULL,status VARCHAR(15) NOT NULL CHECK (status IN ('DRAFT','PARTIAL','COMPLETED','CANCELLED')),
 version BIGINT NOT NULL DEFAULT 0,created_at TIMESTAMP WITH TIME ZONE NOT NULL,
 UNIQUE(user_id,id)
);
CREATE TABLE shopping_receipts (
 id UUID PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id),
 list_id UUID,operation_id UUID NOT NULL UNIQUE REFERENCES inventory_operations(id),
 food_id UUID NOT NULL,basis VARCHAR(15) NOT NULL,quantity NUMERIC(19,6) NOT NULL CHECK (quantity>0),
 FOREIGN KEY(user_id,list_id) REFERENCES shopping_lists(user_id,id),
 FOREIGN KEY(user_id,food_id) REFERENCES foods(user_id,id)
);

