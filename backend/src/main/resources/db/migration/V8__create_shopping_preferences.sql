CREATE TABLE shopping_preferences (
 user_id UUID PRIMARY KEY REFERENCES users(id),
 cycle VARCHAR(10) NOT NULL CHECK (cycle IN ('WEEKLY','MONTHLY')),
 weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
 month_day INTEGER NOT NULL CHECK (month_day BETWEEN 1 AND 31)
);

