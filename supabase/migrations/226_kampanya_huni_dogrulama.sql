-- ─────────────────────────────────────────────────────────────────────────
-- 226 — Kampanya: yumuşak e-posta doğrulama, UTM genişletme, kampanya hunisi
-- ─────────────────────────────────────────────────────────────────────────
-- Yumuşak doğrulama: ücretsiz kayıtta Supabase hesabı onaylı oluşturulur (giriş
-- engeli yok); "e-postasını doğruladı mı" bilgisi uygulama tarafında
-- student_acquisition.email_verified_at'te tutulur. E-posta bağlantısıyla
-- (doğrulama / şifre sıfırlama) giriş yapıldığında sunucu (service role) doldurur.
-- REQUIRE_EMAIL_VERIFICATION=true iken uygulama bu kolona göre girişi engeller.
-- Yazma yalnız service role (tabloda öğrenci için yazma politikası yok).
-- ─────────────────────────────────────────────────────────────────────────

-- 1) student_acquisition: doğrulama zamanı, utm_content, kayıt yöntemi
alter table public.student_acquisition
  add column if not exists email_verified_at timestamptz,
  add column if not exists utm_content text,
  add column if not exists signup_method text not null default 'email';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'student_acquisition_utm_content_len' and conrelid = 'public.student_acquisition'::regclass) then
    alter table public.student_acquisition
      add constraint student_acquisition_utm_content_len check (utm_content is null or length(utm_content) <= 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'student_acquisition_signup_method_check' and conrelid = 'public.student_acquisition'::regclass) then
    alter table public.student_acquisition
      add constraint student_acquisition_signup_method_check check (signup_method in ('email', 'google'));
  end if;
end $$;

-- Mevcut kayıtlar: Supabase doğrulama zamanı aynen taşınır.
update public.student_acquisition a
   set email_verified_at = u.email_confirmed_at
  from auth.users u
 where u.id = a.student_id
   and a.email_verified_at is null
   and u.email_confirmed_at is not null;

-- 2) page_views: kampanya hunisi için UTM (anonim; kişisel veri yok)
alter table public.page_views
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'page_views_utm_len' and conrelid = 'public.page_views'::regclass) then
    alter table public.page_views
      add constraint page_views_utm_len check (
        (utm_source is null or length(utm_source) <= 100)
        and (utm_medium is null or length(utm_medium) <= 100)
        and (utm_campaign is null or length(utm_campaign) <= 100)
        and (utm_content is null or length(utm_content) <= 100)
      );
  end if;
end $$;

create index if not exists page_views_path_created_idx on public.page_views (path, created_at);

-- 3) Bireysel öğrenci özeti: doğrulama bilgisi geliş kaydından (yoksa Supabase'den)
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
         case when a.student_id is not null then a.email_verified_at is not null
              else b.email_confirmed_at is not null end,
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

-- 4) Kampanya hunisi: /ucretsiz ziyareti → ücretsiz kayıt → UpPlan kurulumu → ilk soru kaydı
--    (utm_source × utm_campaign; ziyaret = tekil anonim oturum). Yalnız platform müdürü.
create or replace function public.campaign_funnel(p_since date)
returns table (
  utm_source text,
  utm_campaign text,
  visits integer,
  signups integer,
  setups integer,
  first_questions integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_since timestamptz := (p_since::timestamp at time zone 'Europe/Istanbul');
begin
  if coalesce(auth.role(), '') <> 'service_role' and public.current_user_role() is distinct from 'admin' then
    raise exception 'Yetkisiz işlem.' using errcode = '42501';
  end if;

  return query
  with v as (
    select coalesce(pv.utm_source, '') as src, coalesce(pv.utm_campaign, '') as cmp,
           count(distinct coalesce(pv.session_id, pv.id::text))::integer as n
      from public.page_views pv
     where pv.event_type = 'page_view'
       and pv.path = '/ucretsiz'
       and pv.is_authenticated = false
       and pv.created_at >= v_since
     group by 1, 2
  ),
  s as (
    select coalesce(a.utm_source, '') as src, coalesce(a.utm_campaign, '') as cmp,
           count(*)::integer as n_signup,
           count(*) filter (where up.completed_at is not null)::integer as n_setup,
           count(*) filter (where exists (select 1 from public.study_sessions ss where ss.student_id = a.student_id))::integer as n_first
      from public.student_acquisition a
      left join public.student_upplan_profile up on up.student_id = a.student_id
     where a.source = 'ucretsiz_kayit'
       and a.created_at >= v_since
     group by 1, 2
  )
  select nullif(coalesce(v.src, s.src), ''),
         nullif(coalesce(v.cmp, s.cmp), ''),
         coalesce(v.n, 0),
         coalesce(s.n_signup, 0),
         coalesce(s.n_setup, 0),
         coalesce(s.n_first, 0)
    from v
    full outer join s on s.src = v.src and s.cmp = v.cmp
   order by 4 desc, 3 desc;
end;
$$;
revoke all on function public.campaign_funnel(date) from public, anon;
grant execute on function public.campaign_funnel(date) to authenticated, service_role;
