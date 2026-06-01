-- CHAMP Health Care Services — Full Database Schema
-- Run this in Supabase Dashboard → SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('superadmin','admin','employee')),
  position TEXT CHECK (position IN ('PSW','RPN','HSKP','UCP','SRV','ADMIN')),
  pay_rate NUMERIC(8,2) DEFAULT 0,
  phone TEXT,
  expo_push_token TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  abbreviation VARCHAR(10) NOT NULL UNIQUE,
  address TEXT,
  city TEXT,
  province TEXT DEFAULT 'ON',
  postal_code TEXT,
  phone TEXT,
  fax TEXT,
  contact_name TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BILLING RATES
-- ============================================================
CREATE TABLE IF NOT EXISTS billing_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  position TEXT NOT NULL CHECK (position IN ('PSW','RPN','HSKP','UCP','SRV')),
  rate NUMERIC(8,2) NOT NULL,
  is_statutory_double BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, position)
);

-- ============================================================
-- PAY PERIODS
-- ============================================================
CREATE TABLE IF NOT EXISTS pay_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(start_date, end_date)
);

-- ============================================================
-- SHIFTS
-- ============================================================
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  day_of_week VARCHAR(10),
  time_in TIME NOT NULL,
  time_out TIME NOT NULL,
  payroll_hours NUMERIC(5,2) NOT NULL,
  invoice_hours NUMERIC(5,2) NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('PSW','RPN','HSKP','UCP','SRV')),
  is_statutory_holiday BOOLEAN DEFAULT false,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','invoiced')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYROLL
-- ============================================================
CREATE TABLE IF NOT EXISTS payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_period_id UUID NOT NULL REFERENCES pay_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_hours NUMERIC(7,2) DEFAULT 0,
  gross_pay NUMERIC(10,2) DEFAULT 0,
  cpp_deduction NUMERIC(10,2) DEFAULT 0,
  ei_deduction NUMERIC(10,2) DEFAULT 0,
  income_tax NUMERIC(10,2) DEFAULT 0,
  uber_misc_deduction NUMERIC(10,2) DEFAULT 0,
  net_pay NUMERIC(10,2) DEFAULT 0,
  generated_at TIMESTAMPTZ,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pay_period_id, employee_id)
);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  invoice_number VARCHAR(30) NOT NULL UNIQUE,
  subtotal NUMERIC(10,2) DEFAULT 0,
  hst_amount NUMERIC(10,2) DEFAULT 0,
  total_due NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','paid')),
  generated_at TIMESTAMPTZ,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVOICE LINE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
  date_of_service DATE NOT NULL,
  shift_hours NUMERIC(5,2) NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('PSW','RPN','HSKP','UCP','SRV')),
  time_in TIME NOT NULL,
  time_out TIME NOT NULL,
  rate NUMERIC(8,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  is_statutory BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- KNEX MIGRATION TRACKING (lets npm run migrate skip re-running)
-- ============================================================
CREATE TABLE IF NOT EXISTS knex_migrations (
  id SERIAL PRIMARY KEY,
  name TEXT,
  batch INTEGER,
  migration_time TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knex_migrations_lock (
  index SERIAL PRIMARY KEY,
  is_locked INTEGER DEFAULT 0
);

INSERT INTO knex_migrations_lock (is_locked) VALUES (0) ON CONFLICT DO NOTHING;

INSERT INTO knex_migrations (name, batch) VALUES
  ('001_create_users.js', 1),
  ('002_create_clients.js', 1),
  ('003_create_billing_rates.js', 1),
  ('004_create_pay_periods.js', 1),
  ('005_create_shifts.js', 1),
  ('006_create_payroll.js', 1),
  ('007_create_invoices.js', 1)
ON CONFLICT DO NOTHING;

SELECT 'Schema created successfully ✓' AS result;
