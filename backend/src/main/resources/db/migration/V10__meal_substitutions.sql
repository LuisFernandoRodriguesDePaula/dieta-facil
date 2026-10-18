CREATE TABLE meal_substitution_rules (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 logical_id UUID NOT NULL, food_id UUID NOT NULL, basis VARCHAR(10) NOT NULL,
 source_quantity NUMERIC(19,6) NOT NULL, enabled BOOLEAN NOT NULL,
 version BIGINT NOT NULL, alternatives TEXT NOT NULL,
 FOREIGN KEY(user_id,food_id) REFERENCES foods(user_id,id),
 UNIQUE(user_id,logical_id,food_id,basis)
);
CREATE TABLE meal_overrides (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 local_date DATE NOT NULL, snapshot TEXT NOT NULL
);
CREATE INDEX overrides_owner_date ON meal_overrides(user_id,local_date);
CREATE TABLE meal_substitution_actions (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 request TEXT NOT NULL, scope VARCHAR(10) NOT NULL, local_date DATE NOT NULL,
 logical_id UUID NOT NULL, before_json TEXT NOT NULL, after_json TEXT NOT NULL,
 plan_version BIGINT NOT NULL, undone BOOLEAN NOT NULL DEFAULT FALSE
);
