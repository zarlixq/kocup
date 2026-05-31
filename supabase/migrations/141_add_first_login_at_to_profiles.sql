-- ─────────────────────────────────────────────────────────────────────────
-- 141 — Davet kabul / ilk giriş takibi
-- ─────────────────────────────────────────────────────────────────────────
-- Müdür/kurum panelinde "Davet Beklemede" vs "Aktif" badge'i göstermek için.
--
-- profiles.first_login_at: kullanıcı ilk kez başarılı giriş yaptığı an.
-- Davet edilmiş ama henüz giriş yapmamış → null. Listede badge bu kolona
-- bakar; auth.users tablosuna her satır için ekstra REST/RPC çağrısı
-- yapılmasına gerek kalmaz.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists first_login_at timestamptz;

-- ─────────────────────────────────────────────────────────────────────────
-- Backfill: mevcut tüm kullanıcılar için auth.users.last_sign_in_at'tan
-- ilk login zamanını çek. (last_sign_in_at son login'i tutar ama bizim için
-- "hiç login olmuş mu?" kontrolü için yeterli; first_login_at sadece null vs
-- timestamp ayrımı için kullanılır.)
-- ─────────────────────────────────────────────────────────────────────────
update public.profiles p
   set first_login_at = au.last_sign_in_at
  from auth.users au
 where p.id = au.id
   and au.last_sign_in_at is not null
   and p.first_login_at is null;

-- ─────────────────────────────────────────────────────────────────────────
-- Trigger: auth.users.last_sign_in_at null → not null geçişinde sync
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.sync_first_login_at()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if (old.last_sign_in_at is null) and (new.last_sign_in_at is not null) then
    update public.profiles
       set first_login_at = new.last_sign_in_at
     where id = new.id
       and first_login_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_first_login_at on auth.users;
create trigger trg_sync_first_login_at
  after update of last_sign_in_at on auth.users
  for each row
  execute function public.sync_first_login_at();
