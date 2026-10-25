-- Profile bootstrap and private verification storage. Never expose service-role keys to the browser.
grant insert (id, display_name, phone, preferred_language, account_type, avatar_path) on public.abn_profiles to authenticated;
grant update (display_name, phone, preferred_language, avatar_path, updated_at, account_type) on public.abn_profiles to authenticated;

create or replace function private.handle_new_abn_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare requested_type text := new.raw_user_meta_data ->> 'account_type';
begin
 insert into public.abn_profiles (id, display_name, preferred_language, account_type)
 values (
  new.id,
  coalesce(new.raw_user_meta_data ->> 'display_name', ''),
  case when new.raw_user_meta_data ->> 'preferred_language' in ('en','hi','mr') then new.raw_user_meta_data ->> 'preferred_language' else 'en' end,
  case when requested_type in ('consumer','business_owner','service_provider','business_and_services') then requested_type::public.abn_account_type else 'consumer'::public.abn_account_type end
 ) on conflict (id) do nothing;
 return new;
end;
$$;
revoke all on function private.handle_new_abn_user() from public, anon, authenticated;
drop trigger if exists abn_on_auth_user_created on auth.users;
create trigger abn_on_auth_user_created after insert on auth.users for each row execute function private.handle_new_abn_user();

insert into storage.buckets (id, name, public) values ('abn-private-verification','abn-private-verification',false) on conflict (id) do nothing;
drop policy if exists "abn_private_docs_select_own" on storage.objects;
create policy "abn_private_docs_select_own" on storage.objects for select to authenticated using (bucket_id = 'abn-private-verification' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "abn_private_docs_insert_own" on storage.objects;
create policy "abn_private_docs_insert_own" on storage.objects for insert to authenticated with check (bucket_id = 'abn-private-verification' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "abn_private_docs_update_own" on storage.objects;
create policy "abn_private_docs_update_own" on storage.objects for update to authenticated using (bucket_id = 'abn-private-verification' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'abn-private-verification' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "abn_private_docs_delete_own" on storage.objects;
create policy "abn_private_docs_delete_own" on storage.objects for delete to authenticated using (bucket_id = 'abn-private-verification' and (storage.foldername(name))[1] = (select auth.uid())::text);
