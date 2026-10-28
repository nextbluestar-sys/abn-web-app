-- Keep a clearly named full-address text column while preserving address_line
-- for compatibility with existing clients and listing queries.
ALTER TABLE public.abn_businesses
  ADD COLUMN IF NOT EXISTS full_address text;

UPDATE public.abn_businesses
SET full_address = address_line
WHERE full_address IS NULL AND address_line IS NOT NULL;

-- Owners may edit the public address text, but cannot change ownership or verification.
GRANT UPDATE (full_address) ON TABLE public.abn_businesses TO authenticated;
