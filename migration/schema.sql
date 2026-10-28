-- ABN fresh-start PostgreSQL schema for Neon.
-- Apply ONLY to the new database. This script does not migrate existing Supabase data.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE public.abn_role AS ENUM ('member', 'business', 'staff', 'admin');
CREATE TYPE public.abn_account_status AS ENUM ('invited', 'active', 'suspended');

CREATE TABLE public.abn_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL UNIQUE,
  email text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  role public.abn_role NOT NULL DEFAULT 'member',
  status public.abn_account_status NOT NULL DEFAULT 'invited',
  force_password_reset boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT abn_users_clerk_id_nonempty CHECK (length(trim(clerk_user_id)) > 0),
  CONSTRAINT abn_users_email_nonempty CHECK (length(trim(email)) > 0)
);
CREATE INDEX abn_users_role_status_idx ON public.abn_users (role, status);

CREATE TABLE public.abn_businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected','suspended')),
  created_by uuid NOT NULL REFERENCES public.abn_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.abn_business_memberships (
  business_id uuid NOT NULL REFERENCES public.abn_businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.abn_users(id) ON DELETE CASCADE,
  membership_role text NOT NULL DEFAULT 'owner' CHECK (membership_role IN ('owner','manager','editor','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, user_id)
);
CREATE INDEX abn_business_memberships_user_idx ON public.abn_business_memberships(user_id);

CREATE TABLE public.abn_staff_permissions (
  user_id uuid NOT NULL REFERENCES public.abn_users(id) ON DELETE CASCADE,
  permission text NOT NULL CHECK (permission IN ('review_verification','manage_members','manage_businesses','manage_listings','view_audit_log')),
  granted_by uuid NOT NULL REFERENCES public.abn_users(id) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission)
);

CREATE TABLE public.abn_audit_logs (
  id bigserial PRIMARY KEY,
  actor_user_id uuid REFERENCES public.abn_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  request_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX abn_audit_logs_created_idx ON public.abn_audit_logs(created_at DESC);
CREATE INDEX abn_audit_logs_actor_idx ON public.abn_audit_logs(actor_user_id, created_at DESC);

-- Neon is accessed only by the trusted Worker using DATABASE_URL.
-- Do not expose database credentials or connect directly from browser code.
-- Application authorization is enforced in Worker code; this schema does not
-- make client-side role claims authoritative.
COMMIT;
