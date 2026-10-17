CREATE TABLE diet_plans (
 user_id UUID PRIMARY KEY REFERENCES users(id), version BIGINT NOT NULL DEFAULT 0
);
CREATE TABLE plan_revisions (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id),
 effective_date DATE NOT NULL, created_at TIMESTAMP WITH TIME ZONE NOT NULL,
 UNIQUE(user_id,effective_date), UNIQUE(user_id,id)
);
CREATE TABLE plan_meals (
 id UUID PRIMARY KEY, revision_id UUID NOT NULL REFERENCES plan_revisions(id) ON DELETE CASCADE,
 user_id UUID NOT NULL, logical_id UUID NOT NULL, name VARCHAR(100) NOT NULL,
 local_time TIME NOT NULL,
 FOREIGN KEY(user_id,revision_id) REFERENCES plan_revisions(user_id,id),
 UNIQUE(revision_id,logical_id)
);
CREATE TABLE meal_days (
 meal_id UUID NOT NULL REFERENCES plan_meals(id) ON DELETE CASCADE,
 weekday INTEGER NOT NULL CHECK(weekday BETWEEN 1 AND 7), PRIMARY KEY(meal_id,weekday)
);
CREATE TABLE plan_items (
 id UUID PRIMARY KEY, meal_id UUID NOT NULL REFERENCES plan_meals(id) ON DELETE CASCADE,
 user_id UUID NOT NULL, food_id UUID NOT NULL,
 quantity NUMERIC(19,6) NOT NULL CHECK(quantity>0),
 unit VARCHAR(10) NOT NULL, basis VARCHAR(10) NOT NULL CHECK(basis IN ('RAW','COOKED','AS_SOLD')),
 food_name VARCHAR(120) NOT NULL, category VARCHAR(30) NOT NULL, frequency VARCHAR(10) NOT NULL,
 FOREIGN KEY(user_id,food_id) REFERENCES foods(user_id,id)
);
CREATE TABLE meal_occurrences (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id), logical_id UUID NOT NULL,
 local_date DATE NOT NULL, status VARCHAR(12) NOT NULL CHECK(status IN ('SKIPPED','CONSUMED')),
 snapshot TEXT NOT NULL, UNIQUE(user_id,logical_id,local_date)
);
CREATE INDEX occurrences_owner_date ON meal_occurrences(user_id,local_date);

