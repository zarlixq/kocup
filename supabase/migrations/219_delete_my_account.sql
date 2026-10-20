-- ─────────────────────────────────────────────────────────────────────────
-- 219 — Hesabımı sil (öğrencinin kendi isteğiyle, yalnız kendi verisi)
-- ─────────────────────────────────────────────────────────────────────────
-- Ayrı migration: DELETE içerdiği için Supabase onay penceresi açar.
-- rate_limits eski pencere temizliği de burada (kişisel veri değil, sayaç).

create or replace function public.purge_old_rate_limits()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limits where window_start < now() - interval '1 day';
$$;
revoke all on function public.purge_old_rate_limits() from public, anon, authenticated;
grant execute on function public.purge_old_rate_limits() to service_role;

-- Hesabımı sil — yalnız öğrencinin kendisi, tek transaction.
-- auth.users silinince profiles → (cascade) tüm öğrenci tabloları silinir.
-- FK'sı olmayan / set null olan ve kişisel veri taşıyan satırlar önce silinir.
-- Storage dosyaları (deneme PDF'leri, geri bildirim görüntüleri) bu fonksiyondan
-- önce sunucuda Storage API ile silinir (SQL ile storage.objects silinemez).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_email text;
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;

  select role, email into v_role, v_email from public.profiles where id = v_uid;
  if v_role is distinct from 'student' then
    raise exception 'Hesap silme yalnızca öğrenci hesapları için kullanılabilir.' using errcode = 'P0001';
  end if;

  -- Muhasebe kayıtları (paket/ödeme) yasal saklama kapsamında: kendiliğinden silinmez.
  if exists (select 1 from public.packages where student_id = v_uid)
     or exists (select 1 from public.payments where student_id = v_uid) then
    raise exception 'Hesabına bağlı ödeme kayıtları olduğu için silme talebini e-posta ile iletmelisin.' using errcode = 'P0001';
  end if;

  delete from public.applications where approved_student_id = v_uid;
  delete from public.import_rows where created_student_id = v_uid;
  delete from public.student_invitations
   where accepted_user_id = v_uid
      or lower(email) = lower(v_email);
  delete from public.auth_role_grants
   where used_by = v_uid
      or lower(email) = lower(v_email);

  delete from auth.users where id = v_uid;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
