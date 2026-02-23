-- 1) First, clean up duplicates by keeping only the LATEST record (highest ID) 
-- for each (renter_id, period_month) pair.
DELETE FROM rent_payments
WHERE id NOT IN (
    SELECT MAX(id)
    FROM rent_payments
    GROUP BY renter_id, period_month
);

-- 2) Now that duplicates are gone, add the unique constraint safely.
-- (Only run these if you haven't successfully run them before)

-- Add collection_date column if it doesn't exist
ALTER TABLE rent_payments 
ADD COLUMN IF NOT EXISTS collection_date DATE DEFAULT CURRENT_DATE;

-- Add unique constraint
ALTER TABLE rent_payments
DROP CONSTRAINT IF EXISTS rent_payments_renter_id_period_month_key;

ALTER TABLE rent_payments
ADD CONSTRAINT rent_payments_renter_id_period_month_key UNIQUE (renter_id, period_month);
