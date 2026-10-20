-- ─────────────────────────────────────────────────────────────────────────
-- 218 — Bireysel öğrenci: ücretsiz kayıt, davet, onaylar, geri bildirim,
--       kayıt/giriş rate limit, bireysel öğrenci özeti (hesap silme: 219)
-- ─────────────────────────────────────────────────────────────────────────
-- GÜVENLİK: Supabase'de açık kayıt (signup) açık ve handle_new_user rolü
-- istemcinin gönderdiği user_metadata.role'den okuyordu → anon key ile
-- signUp({ data: { role: 'admin' } }) platform yöneticisi oluşturabiliyordu.
-- Artık rol ve kurum yalnızca sunucunun (service role) önceden yazdığı tek
-- kullanımlık rol hibesinden (auth_role_grants) gelir. Hibe kimliği
-- user_metadata.role_grant ile taşınır (tahmin edilemez uuid) ve e-posta
-- eşleşmesi + süre + tek kullanım kontrol edilir. Hibesiz kayıt en fazla
-- kurumsuz öğrenci olur.
-- ─────────────────────────────────────────────────────────────────────────

-- 1) Rol hibeleri (yalnız service role; politika yok = anon/authenticated erişemez)
create table if not exists public.auth_role_grants (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null check (role in ('student', 'coach', 'admin', 'org_admin')),
  organization_id uuid references public.organizations(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '1 hour',
  used_at timestamptz,
  used_by uuid,
  created_at timestamptz not null default now()
);
alter table public.auth_role_grants enable row level security;
create index if not exists auth_role_grants_email_idx on public.auth_role_grants (lower(email));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grant_id uuid;
  v_role text;
  v_org_id uuid;
begin
  begin
    v_grant_id := nullif(new.raw_user_meta_data->>'role_grant', '')::uuid;
  exception when others then
    v_grant_id := null;
  end;

  if v_grant_id is not null then
    update public.auth_role_grants
       set used_at = now(), used_by = new.id
     where id = v_grant_id
       and lower(email) = lower(new.email)
       and used_at is null
       and expires_at > now()
    returning role, organization_id into v_role, v_org_id;
  end if;

  -- Hibesiz kayıt: geriye uyumluluk için yalnız kurumsuz 'student' profili
  -- (yayındaki eski kod yolu). Ayrıcalıklı rol / kurum bağı ASLA metadata'dan alınmaz.
  if v_role is null then
    if new.raw_user_meta_data->>'role' = 'student' then
      v_role := 'student';
      v_org_id := null;
    else
      return new;
    end if;
  end if;

  insert into public.profiles (id, role, full_name, email, phone, organization_id)
  values (
    new.id,
    v_role,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone',
    v_org_id
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- 2) Geliş yolu + UTM (bireysel öğrenci analitiği)
create table if not exists public.student_acquisition (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  source text not null check (source in ('ucretsiz_kayit', 'davet')),
  segment text check (segment is null or segment in ('yks', 'lgs')),
  alan text check (alan is null or alan in ('sayisal', 'ea', 'sozel', 'dil')),
  grade text,
  is_minor boolean,
  utm_source text check (utm_source is null or length(utm_source) <= 100),
  utm_medium text check (utm_medium is null or length(utm_medium) <= 100),
  utm_campaign text check (utm_campaign is null or length(utm_campaign) <= 100),
  invitation_id uuid,
  created_at timestamptz not null default now()
);
alter table public.student_acquisition enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'student_acquisition' and policyname = 'student_acquisition_admin_select') then
    create policy student_acquisition_admin_select on public.student_acquisition
      for select using (public.current_user_role() = 'admin');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'student_acquisition' and policyname = 'student_acquisition_own_select') then
    create policy student_acquisition_own_select on public.student_acquisition
      for select using (student_id = auth.uid());
  end if;
end $$;

-- 3) Yasal onaylar (tarih/saat + metin versiyonu). Yazma yalnız service role.
create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  consent_type text not null check (consent_type in ('kullanim_sartlari', 'gizlilik', 'kvkk_aydinlatma', 'veli_bilgisi')),
  version text not null,
  accepted_at timestamptz not null default now()
);
alter table public.user_consents enable row level security;
create index if not exists user_consents_user_idx on public.user_consents (user_id);

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_consents' and policyname = 'user_consents_own_select') then
    create policy user_consents_own_select on public.user_consents
      for select using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_consents' and policyname = 'user_consents_admin_select') then
    create policy user_consents_admin_select on public.user_consents
      for select using (public.current_user_role() = 'admin');
  end if;
end $$;

-- 4) Öğrenci davetleri
create table if not exists public.student_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null check (length(email) <= 254),
  full_name text not null check (length(full_name) between 2 and 120),
  phone text check (phone is null or length(phone) <= 20),
  segment text not null check (segment in ('yks', 'lgs')),
  grade text check (grade is null or grade in ('5', '6', '7', '8', '9', '10', '11', '12', 'Mezun')),
  organization_id uuid references public.organizations(id) on delete cascade,
  coach_id uuid references public.profiles(id) on delete set null,
  token_hash text not null unique,
  status text not null default 'gonderildi' check (status in ('gonderildi', 'kabul_edildi', 'suresi_doldu', 'iptal')),
  expires_at timestamptz not null default now() + interval '7 days',
  invited_by uuid references public.profiles(id) on delete set null,
  accepted_user_id uuid references public.profiles(id) on delete set null,
  sent_at timestamptz not null default now(),
  send_count integer not null default 1,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.student_invitations enable row level security;
create index if not exists student_invitations_org_idx on public.student_invitations (organization_id);
create index if not exists student_invitations_status_idx on public.student_invitations (status);
-- Aynı e-postaya aynı anda tek bekleyen davet
create unique index if not exists student_invitations_pending_email_uq
  on public.student_invitations (lower(email)) where status = 'gonderildi';

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'student_invitations' and policyname = 'student_invitations_admin_all') then
    create policy student_invitations_admin_all on public.student_invitations
      for all using (public.current_user_role() = 'admin')
      with check (public.current_user_role() = 'admin');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'student_invitations' and policyname = 'student_invitations_org_admin_select') then
    create policy student_invitations_org_admin_select on public.student_invitations
      for select using (organization_id is not null and public.is_org_admin_of(organization_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'student_invitations' and policyname = 'student_invitations_org_admin_insert') then
    create policy student_invitations_org_admin_insert on public.student_invitations
      for insert with check (
        organization_id is not null
        and public.is_org_admin_of(organization_id)
        and (
          coach_id is null
          or exists (
            select 1 from public.profiles c
             where c.id = student_invitations.coach_id
               and c.role = 'coach'
               and c.organization_id = student_invitations.organization_id
          )
        )
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'student_invitations' and policyname = 'student_invitations_org_admin_update') then
    create policy student_invitations_org_admin_update on public.student_invitations
      for update using (organization_id is not null and public.is_org_admin_of(organization_id))
      with check (
        organization_id is not null
        and public.is_org_admin_of(organization_id)
        and (
          coach_id is null
          or exists (
            select 1 from public.profiles c
             where c.id = student_invitations.coach_id
               and c.role = 'coach'
               and c.organization_id = student_invitations.organization_id
          )
        )
      );
  end if;
end $$;

-- 5) Geri bildirim
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (length(message) between 3 and 2000),
  page_path text check (page_path is null or length(page_path) <= 300),
  screenshot_path text,
  status text not null default 'yeni' check (status in ('yeni', 'incelendi', 'kapandi')),
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
create index if not exists feedback_user_idx on public.feedback (user_id);
create index if not exists feedback_created_idx on public.feedback (created_at desc);

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'feedback' and policyname = 'feedback_own_insert') then
    create policy feedback_own_insert on public.feedback
      for insert with check (user_id = auth.uid() and status = 'yeni' and screenshot_path is null);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'feedback' and policyname = 'feedback_own_select') then
    create policy feedback_own_select on public.feedback
      for select using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'feedback' and policyname = 'feedback_admin_all') then
    create policy feedback_admin_all on public.feedback
      for all using (public.current_user_role() = 'admin')
      with check (public.current_user_role() = 'admin');
  end if;
end $$;

-- Ekran görüntüsü bucket'ı (private; yükleme/okuma yalnız sunucu, service role)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback', 'feedback', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- 6) Kayıt/giriş rate limit (sabit pencere sayacı; yalnız service role)
create table if not exists public.rate_limits (
  bucket text not null,
  key_hash text not null,
  window_start timestamptz not null,
  hits integer not null default 1,
  primary key (bucket, key_hash, window_start)
);
alter table public.rate_limits enable row level security;

create or replace function public.check_rate_limit(
  p_bucket text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limits (bucket, key_hash, window_start, hits)
  values (p_bucket, p_key_hash, v_start, 1)
  on conflict (bucket, key_hash, window_start)
  do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;

  return v_hits <= p_limit;
end;
$$;
revoke all on function public.check_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, text, integer, integer) to service_role;

-- 7) Bireysel öğrenciler (kurumsuz + koçsuz) — yalnız platform müdürü
create or replace function public.individual_students_overview()
returns table (
  student_id uuid,
  full_name text,
  email text,
  created_at timestamptz,
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  segment text,
  alan text,
  grade text,
  email_confirmed boolean,
  upplan_completed boolean,
  last_sign_in_at timestamptz,
  sessions_7d integer,
  first_session_date date,
  last_activity_date date,
  returned_d7 boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Europe/Istanbul')::date;
begin
  if coalesce(auth.role(), '') <> 'service_role' and public.current_user_role() is distinct from 'admin' then
    raise exception 'Yetkisiz işlem.' using errcode = '42501';
  end if;

  return query
  with base as (
    select p.id, p.full_name, p.email, coalesce(p.created_at, u.created_at) as created_at,
           u.email_confirmed_at, u.last_sign_in_at, s.grade as s_grade
      from public.students s
      join public.profiles p on p.id = s.id
      join auth.users u on u.id = s.id
     where p.role = 'student'
       and s.coach_id is null
       and s.organization_id is null
       and p.organization_id is null
  ),
  sess as (
    select ss.student_id,
           count(*) filter (where ss.date >= v_today - 6)::integer as n7,
           min(ss.date) as first_date,
           max(ss.date) as last_date
      from public.study_sessions ss
     where ss.student_id in (select id from base)
     group by ss.student_id
  )
  select b.id,
         b.full_name,
         b.email,
         b.created_at,
         a.source,
         a.utm_source,
         a.utm_medium,
         a.utm_campaign,
         coalesce(up.segment, a.segment),
         coalesce(up.alan, a.alan),
         coalesce(b.s_grade, a.grade),
         b.email_confirmed_at is not null,
         up.completed_at is not null,
         b.last_sign_in_at,
         coalesce(se.n7, 0),
         se.first_date,
         greatest(se.last_date, (b.last_sign_in_at at time zone 'Europe/Istanbul')::date),
         case
           when b.created_at > now() - interval '7 days' then null
           else (
             b.last_sign_in_at >= b.created_at + interval '7 days'
             or se.last_date >= ((b.created_at at time zone 'Europe/Istanbul')::date + 7)
           )
         end
    from base b
    left join public.student_acquisition a on a.student_id = b.id
    left join public.student_upplan_profile up on up.student_id = b.id
    left join sess se on se.student_id = b.id
   order by b.created_at desc;
end;
$$;
revoke all on function public.individual_students_overview() from public, anon;
grant execute on function public.individual_students_overview() to authenticated, service_role;
