-- BSVS family membership records. Passwords are never stored in these tables.
create table if not exists public.abn_families (
  id uuid primary key default gen_random_uuid(),
  family_number bigint generated always as identity unique,
  family_id text unique,
  family_head_name text not null,
  phone text,
  address text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.abn_memberships (
  id uuid primary key default gen_random_uuid(),
  member_id text not null unique,
  family_id text not null references public.abn_families(family_id),
  extension_number integer not null check (extension_number > 0),
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  member_name text not null,
  relationship_to_head text not null default 'Family head',
  phone text,
  status text not null default 'active' check (status in ('active','suspended')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(family_id, extension_number)
);
create index if not exists abn_memberships_family_idx on public.abn_memberships(family_id);
create index if not exists abn_memberships_user_idx on public.abn_memberships(auth_user_id);
alter table public.abn_families enable row level security;
alter table public.abn_memberships enable row level security;
revoke all on public.abn_families, public.abn_memberships from anon, authenticated;
grant select on public.abn_memberships to authenticated;
create policy "members_read_own_membership" on public.abn_memberships
 for select to authenticated using (auth_user_id = (select auth.uid()));
