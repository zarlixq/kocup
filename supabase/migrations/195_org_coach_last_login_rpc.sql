-- ─────────────────────────────────────────────────────────────────────────
-- 195 — Kurum (org_admin) koç aktiflik paneli: koç son giriş tarihi RPC
-- ─────────────────────────────────────────────────────────────────────────
-- "Son giriş" bilgisi yalnız auth.users.last_sign_in_at'te tutulur; public
-- şemadan RLS ile erişilemez. Bu yüzden SECURITY DEFINER bir fonksiyonla,
-- YALNIZ çağıran org_admin'in KENDİ kurumundaki koçlar için son giriş tarihini
-- döndürürüz. Tenant izolasyonu fonksiyon gövdesinde zorlanır:
--   * current_user_role() = 'org_admin'  (başka rol → 0 satır)
--   * p.organization_id = current_user_org_id()  (yalnız kendi kurumu)
-- Böylece org_admin başka kurumun koç verisini asla göremez.
--
-- ROLLBACK:
--   drop function if exists public.org_coach_last_login();
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.org_coach_last_login()
returns table (
  coach_id         uuid,
  last_sign_in_at  timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select p.id, u.last_sign_in_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.role = 'coach'
    and p.organization_id is not null
    and public.current_user_role() = 'org_admin'
    and p.organization_id = public.current_user_org_id()
$$;

revoke all on function public.org_coach_last_login() from public;
grant execute on function public.org_coach_last_login() to authenticated;
