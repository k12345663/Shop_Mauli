-- Run this in your Supabase SQL Editor to apply the changes
-- Add collection_date column if it doesn't exist
ALTER TABLE rent_payments 
ADD COLUMN IF NOT EXISTS collection_date DATE DEFAULT CURRENT_DATE;

-- Add unique constraint to prevent duplicate payments for the same month
-- Note: This might fail if you already have duplicates. 
-- Please clean up duplicates before running if you see an error.
ALTER TABLE rent_payments
ADD CONSTRAINT rent_payments_renter_id_period_month_key UNIQUE (renter_id, period_month);
