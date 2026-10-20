-- ─────────────────────────────────────────────────────────────────────────
-- 220 — Kullanılmış rol hibesi, hesap hangi yoldan silinirse silinsin gitsin
-- ─────────────────────────────────────────────────────────────────────────
-- auth_role_grants.used_by FK'sız idi; admin API / delete_student_safely ile
-- silinen hesapların hibe satırı (e-posta içerir) kalıyordu (e2e kalıntı testi).
-- Hesaba bağlanmış satırı auth.users ile cascade bağla. Süresi dolmuş, hiç
-- kullanılmamış hibeler hesap oluşmadığı için kişiye bağlanmaz.

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'auth_role_grants_used_by_fkey'
       and conrelid = 'public.auth_role_grants'::regclass
  ) then
    alter table public.auth_role_grants
      add constraint auth_role_grants_used_by_fkey
      foreign key (used_by) references auth.users(id) on delete cascade;
  end if;
end $$;
