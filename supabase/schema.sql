-- =============================================
-- RentFlow Schema — Run this in SQL Editor
-- =============================================

-- 1) TABLES FIRST
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'collector' CHECK (role IN ('admin', 'collector', 'owner')),
  is_approved BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS shops (
  id                   BIGSERIAL PRIMARY KEY,
  shop_no              TEXT UNIQUE NOT NULL,
  rent_amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  rent_collection_day  SMALLINT NOT NULL DEFAULT 1 CHECK (rent_collection_day BETWEEN 1 AND 31),
  is_active            BOOLEAN DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- Fix: Add column to existing table if it doesn't exist
ALTER TABLE shops ADD COLUMN IF NOT EXISTS rent_collection_day SMALLINT NOT NULL DEFAULT 1 CHECK (rent_collection_day BETWEEN 1 AND 31);


-- Global settings (one row, keyed by key name)
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- Default: rent collected on the 1st of each month
INSERT INTO settings (key, value) VALUES ('default_collection_day', '1')
  ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS renters (
  id          BIGSERIAL PRIMARY KEY,
  renter_code TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  phone       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS renter_shops (
  id        BIGSERIAL PRIMARY KEY,
  renter_id BIGINT NOT NULL REFERENCES renters(id) ON DELETE CASCADE,
  shop_id   BIGINT NOT NULL REFERENCES shops(id)   ON DELETE CASCADE,
  UNIQUE(renter_id, shop_id)
);

CREATE TABLE IF NOT EXISTS rent_payments (
  id                BIGSERIAL PRIMARY KEY,
  renter_id         BIGINT NOT NULL REFERENCES renters(id),
  collector_user_id UUID REFERENCES profiles(id),
  period_month      TEXT NOT NULL,
  expected_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  received_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL CHECK (status IN ('paid', 'partial', 'unpaid')),
  notes             TEXT DEFAULT '',
  collection_date   DATE DEFAULT CURRENT_DATE,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(renter_id, period_month)
);

-- 2) HELPER FUNCTION (after profiles table)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = auth.uid());
END;
$$;

-- 3) ENABLE RLS
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops         ENABLE ROW LEVEL SECURITY;
ALTER TABLE renters       ENABLE ROW LEVEL SECURITY;
ALTER TABLE renter_shops  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;

-- 4) DROP ALL OLD POLICIES
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE tablename IN ('profiles','shops','renters','renter_shops','rent_payments')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 5) RLS POLICIES
CREATE POLICY "p_own"    ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "p_all"    ON profiles FOR SELECT USING (get_my_role() IN ('admin','owner'));
CREATE POLICY "p_insert" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "p_update" ON profiles FOR UPDATE USING (get_my_role() IN ('admin','owner'));
CREATE POLICY "p_delete" ON profiles FOR DELETE USING (get_my_role() IN ('admin','owner'));

CREATE POLICY "s_sel" ON shops FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "s_ins" ON shops FOR INSERT WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "s_upd" ON shops FOR UPDATE USING (get_my_role() = 'admin');
CREATE POLICY "s_del" ON shops FOR DELETE USING (get_my_role() = 'admin');

CREATE POLICY "r_sel" ON renters FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "r_ins" ON renters FOR INSERT WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "r_upd" ON renters FOR UPDATE USING (get_my_role() = 'admin');
CREATE POLICY "r_del" ON renters FOR DELETE USING (get_my_role() = 'admin');

CREATE POLICY "rs_sel" ON renter_shops FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "rs_ins" ON renter_shops FOR INSERT WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "rs_del" ON renter_shops FOR DELETE USING (get_my_role() = 'admin');

CREATE POLICY "pay_sel" ON rent_payments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "pay_ins" ON rent_payments FOR INSERT WITH CHECK (get_my_role() IN ('admin','collector'));
CREATE POLICY "pay_upd" ON rent_payments FOR UPDATE USING (get_my_role() = 'admin');
CREATE POLICY "pay_del" ON rent_payments FOR DELETE USING (get_my_role() = 'admin');

-- 6) SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE v_role TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'collector');
  BEGIN
    INSERT INTO public.profiles (id, full_name, role, is_approved)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), v_role, true)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- never block user creation
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();