-- ABN initial schema. Apply only to the dedicated ABN Supabase project.
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.abn_account_type as enum ('consumer','business_owner','service_provider','business_and_services');
create type public.abn_account_status as enum ('pending','active','suspended');
create type public.abn_verification_status as enum ('pending','in_review','verified','rejected');
create type public.abn_listing_type as enum ('product','service');
create type public.abn_listing_status as enum ('draft','published','archived');
create type public.abn_enquiry_status as enum ('new','responded','closed');

create table public.abn_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '',
 phone text,
 preferred_language text not null default 'en' check (preferred_language in ('en','hi','mr')),
 account_type public.abn_account_type not null default 'consumer',
 account_status public.abn_account_status not null default 'pending',
 avatar_path text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.abn_profiles enable row level security;

create table public.abn_businesses (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.abn_profiles(id) on delete restrict,
 name text not null check (char_length(name) between 2 and 160),
 slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 category text not null,
 description text not null default '',
 business_email text,
 phone text,
 website text,
 gstin text,
 address_line text,
 city text,
 state text,
 pincode text,
 verification_status public.abn_verification_status not null default 'pending',
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.abn_businesses enable row level security;
create index abn_businesses_owner_idx on public.abn_businesses(owner_id);
create index abn_businesses_category_idx on public.abn_businesses(category);
create index abn_businesses_location_idx on public.abn_businesses(state, city);

create table public.abn_business_members (
 business_id uuid not null references public.abn_businesses(id) on delete cascade,
 user_id uuid not null references public.abn_profiles(id) on delete cascade,
 member_role text not null default 'staff' check (member_role in ('owner','manager','staff')),
 created_at timestamptz not null default now(),
 primary key (business_id, user_id)
);
alter table public.abn_business_members enable row level security;

create table public.abn_listings (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.abn_businesses(id) on delete cascade,
 created_by uuid not null references public.abn_profiles(id) on delete restrict,
 listing_type public.abn_listing_type not null,
 title text not null check (char_length(title) between 2 and 180),
 description text not null default '',
 category text not null,
 price numeric(12,2) check (price is null or price >= 0),
 currency char(3) not null default 'INR',
 unit text,
 stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
 image_paths text[] not null default '{}',
 city text,
 state text,
 status public.abn_listing_status not null default 'draft',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.abn_listings enable row level security;
create index abn_listings_business_idx on public.abn_listings(business_id);
create index abn_listings_browse_idx on public.abn_listings(listing_type, category, status);
create index abn_listings_created_idx on public.abn_listings(created_at desc);

create table public.abn_enquiries (
 id uuid primary key default gen_random_uuid(),
 buyer_id uuid not null references public.abn_profiles(id) on delete restrict,
 business_id uuid not null references public.abn_businesses(id) on delete cascade,
 listing_id uuid references public.abn_listings(id) on delete set null,
 enquiry_type text not null default 'general' check (enquiry_type in ('general','bulk_order','product','service','quotation')),
 message text not null check (char_length(message) between 1 and 5000),
 quantity numeric(12,2) check (quantity is null or quantity > 0),
 status public.abn_enquiry_status not null default 'new',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.abn_enquiries enable row level security;
create index abn_enquiries_buyer_idx on public.abn_enquiries(buyer_id, created_at desc);
create index abn_enquiries_business_idx on public.abn_enquiries(business_id, created_at desc);

create table public.abn_reviews (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references public.abn_profiles(id) on delete restrict,
 business_id uuid not null references public.abn_businesses(id) on delete cascade,
 rating smallint not null check (rating between 1 and 5),
 review_text text not null default '' check (char_length(review_text) <= 2000),
 created_at timestamptz not null default now(),
 unique(author_id, business_id)
);
alter table public.abn_reviews enable row level security;
create index abn_reviews_business_idx on public.abn_reviews(business_id, created_at desc);

create table private.abn_verification_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.abn_profiles(id) on delete cascade,
 business_id uuid references public.abn_businesses(id) on delete cascade,
 verification_type text not null check (verification_type in ('business','community_membership')),
 status public.abn_verification_status not null default 'pending',
 private_document_paths text[] not null default '{}',
 reviewer_notes text,
 reviewed_by uuid references public.abn_profiles(id) on delete set null,
 submitted_at timestamptz not null default now(),
 reviewed_at timestamptz
);
alter table private.abn_verification_requests enable row level security;
revoke all on private.abn_verification_requests from public, anon, authenticated;

create policy "abn_profiles_select_own" on public.abn_profiles for select to authenticated using ((select auth.uid()) = id);
create policy "abn_profiles_insert_own" on public.abn_profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "abn_profiles_update_own" on public.abn_profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "abn_businesses_public_verified" on public.abn_businesses for select to anon, authenticated using ((verification_status = 'verified' and is_active = true) or owner_id = (select auth.uid()));
create policy "abn_businesses_insert_owner" on public.abn_businesses for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "abn_businesses_update_owner" on public.abn_businesses for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "abn_business_members_read_self_or_owner" on public.abn_business_members for select to authenticated using (user_id = (select auth.uid()) or exists (select 1 from public.abn_businesses b where b.id = business_id and b.owner_id = (select auth.uid())));

create policy "abn_listings_public_published" on public.abn_listings for select to anon, authenticated using (
 status = 'published' and exists (select 1 from public.abn_businesses b where b.id = business_id and b.verification_status = 'verified' and b.is_active = true)
);
create policy "abn_listings_owner_read" on public.abn_listings for select to authenticated using (exists (select 1 from public.abn_businesses b where b.id = business_id and b.owner_id = (select auth.uid())));
create policy "abn_listings_owner_insert" on public.abn_listings for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.abn_businesses b where b.id = business_id and b.owner_id = (select auth.uid())));
create policy "abn_listings_owner_update" on public.abn_listings for update to authenticated using (exists (select 1 from public.abn_businesses b where b.id = business_id and b.owner_id = (select auth.uid()))) with check (created_by = (select auth.uid()) and exists (select 1 from public.abn_businesses b where b.id = business_id and b.owner_id = (select auth.uid())));
create policy "abn_listings_owner_delete" on public.abn_listings for delete to authenticated using (exists (select 1 from public.abn_businesses b where b.id = business_id and b.owner_id = (select auth.uid())));

create policy "abn_enquiries_buyer_select" on public.abn_enquiries for select to authenticated using (buyer_id = (select auth.uid()));
create policy "abn_enquiries_buyer_insert" on public.abn_enquiries for insert to authenticated with check (buyer_id = (select auth.uid()) and exists (select 1 from public.abn_businesses b where b.id = business_id and b.verification_status = 'verified' and b.is_active = true));
create policy "abn_enquiries_owner_select" on public.abn_enquiries for select to authenticated using (exists (select 1 from public.abn_businesses b where b.id = business_id and b.owner_id = (select auth.uid())));
create policy "abn_enquiries_owner_update" on public.abn_enquiries for update to authenticated using (exists (select 1 from public.abn_businesses b where b.id = business_id and b.owner_id = (select auth.uid()))) with check (exists (select 1 from public.abn_businesses b where b.id = business_id and b.owner_id = (select auth.uid())));

create policy "abn_reviews_public_read" on public.abn_reviews for select to anon, authenticated using (true);
create policy "abn_reviews_insert_self" on public.abn_reviews for insert to authenticated with check (author_id = (select auth.uid()));
create policy "abn_reviews_update_self" on public.abn_reviews for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "abn_reviews_delete_self" on public.abn_reviews for delete to authenticated using (author_id = (select auth.uid()));

revoke all on public.abn_profiles, public.abn_businesses, public.abn_business_members, public.abn_listings, public.abn_enquiries, public.abn_reviews from anon, authenticated;
grant select, insert on public.abn_profiles to authenticated;
grant update (display_name, phone, preferred_language, avatar_path, updated_at, account_type) on public.abn_profiles to authenticated;
grant select on public.abn_businesses, public.abn_listings, public.abn_reviews to anon, authenticated;
grant insert (owner_id, name, slug, category, description, business_email, phone, website, gstin, address_line, city, state, pincode) on public.abn_businesses to authenticated;
grant update (name, slug, category, description, business_email, phone, website, gstin, address_line, city, state, pincode, updated_at) on public.abn_businesses to authenticated;
grant select on public.abn_business_members to authenticated;
grant select, insert, update, delete on public.abn_listings to authenticated;
grant select on public.abn_enquiries to authenticated;
grant insert (buyer_id, business_id, listing_id, enquiry_type, message, quantity) on public.abn_enquiries to authenticated;
grant update (status, updated_at) on public.abn_enquiries to authenticated;
grant select, insert, update, delete on public.abn_reviews to authenticated;
