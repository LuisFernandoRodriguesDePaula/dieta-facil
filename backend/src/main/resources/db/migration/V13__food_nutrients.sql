CREATE TABLE food_nutrients (
 id UUID PRIMARY KEY,
 user_id UUID NOT NULL,
 food_id UUID NOT NULL,
 revision BIGINT NOT NULL CHECK (revision > 0),
 basis VARCHAR(20) NOT NULL CHECK (basis IN ('RAW','COOKED','AS_SOLD')),
 reference_quantity NUMERIC(19,6) NOT NULL CHECK(reference_quantity>0),
 unit VARCHAR(10) NOT NULL CHECK(unit IN ('G','KG','ML','L','UNIT')),
 protein NUMERIC(19,6) CHECK(protein>=0),
 carbs NUMERIC(19,6) CHECK(carbs>=0),
 fat NUMERIC(19,6) CHECK(fat>=0),
 energy NUMERIC(19,6) CHECK(energy>=0),
 source VARCHAR(250) NOT NULL,
 created_at TIMESTAMP WITH TIME ZONE NOT NULL,
 FOREIGN KEY(user_id,food_id) REFERENCES foods(user_id,id) ON DELETE CASCADE,
 UNIQUE(user_id,food_id,basis,revision)
);
