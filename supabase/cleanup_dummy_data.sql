-- 1) Add category and complex columns to shops table
ALTER TABLE shops ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Numeric';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS complex TEXT NOT NULL DEFAULT 'New Complex';

-- 2) Clean up all existing dummy data
-- Order matters due to foreign key constraints
DELETE FROM rent_payments;
DELETE FROM renter_shops;
DELETE FROM renters;
DELETE FROM shops;

-- 3) Optional: Reset sequences if needed (BigSerial uses sequences)
-- This ensures new IDs start from 1
ALTER SEQUENCE IF EXISTS shops_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS renters_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS renter_shops_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS rent_payments_id_seq RESTART WITH 1;
