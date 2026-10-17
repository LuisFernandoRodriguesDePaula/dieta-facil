CREATE TABLE inventory_accounts (
 user_id UUID NOT NULL REFERENCES users(id),
 food_id UUID NOT NULL,
 basis VARCHAR(15) NOT NULL CHECK (basis IN ('RAW','COOKED','AS_SOLD')),
 knowledge VARCHAR(15) NOT NULL CHECK (knowledge IN ('KNOWN','UNKNOWN','PARTIAL')),
 PRIMARY KEY (user_id,food_id,basis),
 FOREIGN KEY (user_id,food_id) REFERENCES foods(user_id,id)
);
CREATE TABLE inventory_lots (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id),
 food_id UUID NOT NULL, basis VARCHAR(15) NOT NULL CHECK (basis IN ('RAW','COOKED','AS_SOLD')),
 quantity NUMERIC(19,6) NOT NULL CHECK (quantity>=0),
 location VARCHAR(15) NOT NULL CHECK (location IN ('PANTRY','FRIDGE','FREEZER')),
 condition VARCHAR(15) NOT NULL CHECK (condition IN ('SEALED','OPENED','PREPARED')),
 received_date DATE NOT NULL, expiry DATE,
 expiry_source VARCHAR(15) NOT NULL CHECK (expiry_source IN ('LABEL','USER','ESTIMATE','UNKNOWN')),
 opened_date DATE, prepared_date DATE, version BIGINT NOT NULL DEFAULT 0,
 FOREIGN KEY (user_id,food_id) REFERENCES foods(user_id,id),
 CHECK ((expiry IS NULL AND expiry_source='UNKNOWN') OR (expiry IS NOT NULL AND expiry_source<>'UNKNOWN')),
 UNIQUE(user_id,id)
);
CREATE INDEX inventory_lots_owner_food ON inventory_lots(user_id,food_id,basis);
CREATE TABLE inventory_operations (
 id UUID PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id),
 kind VARCHAR(30) NOT NULL, request_key VARCHAR(80) NOT NULL,
 request_hash VARCHAR(64) NOT NULL, request_json TEXT NOT NULL, result_json TEXT NOT NULL,
 source_id UUID, reversal_of UUID UNIQUE REFERENCES inventory_operations(id),
 created_at TIMESTAMP WITH TIME ZONE NOT NULL,
 UNIQUE(user_id,request_key)
);
CREATE TABLE inventory_movements (
 id UUID PRIMARY KEY,user_id UUID NOT NULL,
 operation_id UUID NOT NULL REFERENCES inventory_operations(id),
 lot_id UUID NOT NULL, delta NUMERIC(19,6) NOT NULL CHECK (delta<>0),
 FOREIGN KEY (user_id,lot_id) REFERENCES inventory_lots(user_id,id)
);


