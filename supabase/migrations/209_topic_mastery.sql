-- ─────────────────────────────────────────────────────────────────────────
-- 209 — UpPlan: konu bazlı ustalık skoru (öğrenci modeli)
-- ─────────────────────────────────────────────────────────────────────────
-- Katsayılar: upplan_config (migration 207) ↔ lib/upplan/config.ts.
--
-- FORMÜL (Beta-Bernoulli ortalaması, zaman ağırlıklı kanıtla)
--   Öncül (tarama):  p0 = hic_gormedim 10 | eksik 45 | biliyorum 75  (÷100),
--                    w0 = 20 soru eşdeğeri. Tarama yoksa p0 = 40, w0 = 5.
--   Her kanıt birimi: (tarih d, soru sayısı n, başarısız pay f) — f ≤ n.
--   Zaman ağırlığı:  λ = 0.5 ^ ((as_of − d) / 21)
--   mastery = 100 · (w0·p0 + Σ λ·(n − f)) / (w0 + Σ λ·n)
--
--   Ceza oranı c(tip): bilgi_eksik, hic_fikrim_yok, belirtilmemiş → 1.0
--                      islem_hatasi, dikkat_okuma, sure_yetmedi   → 0.5
--   (Yarım cezalı bir yanlış = yarım başarısız + yarım başarılı soru.)
--
--   Kanıt kaynakları:
--   a) Konulu soru kaydı s: n = doğru + yanlış + boş
--        typed = s'ye bağlı yanlış defteri satırları (s.wrong'un ALT KÜMESİ)
--        f = (s.wrong − |typed|)·1 + Σ c(typed) + s.empty · empty_penalty
--   b) Deneme yanlışı (wrong_answers.exam_id): n = 2, f = 2·c(tip), d = deneme tarihi
--   c) Bağımsız yanlış (oturumsuz ya da konusuz eski oturuma bağlı):
--        n = 1, f = c(tip), d = oturum tarihi / kayıt tarihi
--
--   ÇİFT SAYIM: (a)'daki yanlış defteri satırları ayrı kanıt DEĞİL, oturumun
--   zaten sayılmış yanlışlarının etiketidir; tam cezalılar sonucu değiştirmez,
--   yarım cezalılar yarım soruyu başarıya geri verir. Yalnız (b) ve (c) yeni
--   kanıttır. Deneme yanlışı bir oturuma bağlanamaz (CHECK, migration 208).
--
--   evidence_w = Σ λ·n → güven: < 20 düşük, < 60 orta, ≥ 60 yüksek
--   evidence_n = ham soru sayısı (deneme/bağımsız yanlış: 1)
--   last_practiced_at = en son kanıt tarihi (tarama sayılmaz)
--
-- UNUTMA (okurken, effective_mastery):
--   taban = 0.6 · stored
--   effective = taban + (stored − taban) · 0.5 ^ ((bugün − last_practiced) / 45)
--   Kanıtı olmayan (yalnız taramalı) konu unutulmaz.
--   Etiket (effective): < 40 zayıf, < 75 gelişiyor, ≥ 75 iyi.
--   "Unutulmaya başlıyor": effective < 0.85 · stored.
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1) Tablo ─────────────────────────────────────────────────────────────
create table if not exists public.student_topic_mastery (
  student_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  mastery numeric(5, 2) not null check (mastery between 0 and 100),
  confidence text not null check (confidence in ('dusuk', 'orta', 'yuksek')),
  evidence_n integer not null default 0,
  evidence_w numeric(10, 3) not null default 0,
  last_practiced_at date,
  -- Gerekçe kırılımı (harita "neden bu skor?" paneli)
  breakdown jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (student_id, topic_id)
);

alter table public.student_topic_mastery enable row level security;

drop policy if exists student_topic_mastery_read on public.student_topic_mastery;
create policy student_topic_mastery_read on public.student_topic_mastery
  for select using (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
    or exists (
      select 1 from public.profiles p
       where p.id = student_topic_mastery.student_id
         and p.organization_id is not null
         and public.is_org_admin_of(p.organization_id)
    )
  );
-- Yazma politikası yok: yalnız SECURITY DEFINER fonksiyonlar yazar.

-- ── 2) Yardımcılar ───────────────────────────────────────────────────────
create or replace function public.upplan_cfg(p_key text)
returns numeric
language sql
stable
set search_path = public
as $$
  select value from public.upplan_config where key = p_key
$$;

create or replace function public.upplan_penalty(p_error_type text)
returns numeric
language sql
stable
set search_path = public
as $$
  select case
    when p_error_type in ('islem_hatasi', 'dikkat_okuma', 'sure_yetmedi') then public.upplan_cfg('penalty_half')
    else public.upplan_cfg('penalty_full')
  end
$$;

create or replace function public.effective_mastery(p_stored numeric, p_last date, p_as_of date default null)
returns numeric
language sql
stable
set search_path = public
as $$
  select case
    when p_stored is null then null
    when p_last is null then p_stored
    else round(
      p_stored * public.upplan_cfg('forget_floor_ratio')
      + (p_stored - p_stored * public.upplan_cfg('forget_floor_ratio'))
        * power(0.5::numeric,
                greatest(coalesce(p_as_of, (now() at time zone 'Europe/Istanbul')::date) - p_last, 0)::numeric
                / public.upplan_cfg('forget_half_life_days')),
      2)
  end
$$;

create or replace function public.upplan_confidence(p_evidence_w numeric)
returns text
language sql
stable
set search_path = public
as $$
  select case
    when p_evidence_w >= public.upplan_cfg('confidence_yuksek') then 'yuksek'
    when p_evidence_w >= public.upplan_cfg('confidence_orta') then 'orta'
    else 'dusuk'
  end
$$;

-- ── 3) Hesap (yazmaz; trend için as_of parametreli) ──────────────────────
-- SECURITY INVOKER: çağıranın RLS kapsamında okur (koç/kurum trend'i).
create or replace function public.compute_topic_mastery(p_student_id uuid, p_topic_id uuid, p_as_of date default null)
returns table(
  mastery numeric,
  evidence_n integer,
  evidence_w numeric,
  last_practiced_at date,
  has_assessment boolean,
  breakdown jsonb
)
language sql
stable
set search_path = public
as $$
  with params as (
    select coalesce(p_as_of, (now() at time zone 'Europe/Istanbul')::date) as as_of,
           public.upplan_cfg('evidence_half_life_days') as hl,
           public.upplan_cfg('exam_wrong_weight') as exam_w,
           public.upplan_cfg('penalty_full') as pen_full,
           public.upplan_cfg('empty_penalty') as empty_pen
  ),
  sa as (
    select a.status
      from public.student_topic_self_assessment a
     where a.student_id = p_student_id and a.topic_id = p_topic_id
  ),
  prior as (
    select case (select status from sa)
             when 'hic_gormedim' then public.upplan_cfg('prior_hic_gormedim')
             when 'eksik' then public.upplan_cfg('prior_eksik')
             when 'biliyorum' then public.upplan_cfg('prior_biliyorum')
             else public.upplan_cfg('prior_none')
           end / 100 as p0,
           case when exists (select 1 from sa) then public.upplan_cfg('prior_weight')
                else public.upplan_cfg('prior_none_weight') end as w0
  ),
  sess as (
    select s.id, s.date as d, (s.correct + s.wrong + s.empty)::numeric as n, s.wrong, s.empty
      from public.study_sessions s, params
     where s.student_id = p_student_id
       and s.topic_id = p_topic_id
       and s.date <= params.as_of
  ),
  typed as (
    select w.study_session_id as sid, count(*)::numeric as k, sum(public.upplan_penalty(w.error_type)) as pen
      from public.wrong_answers w
     where w.study_session_id in (select id from sess)
     group by w.study_session_id
  ),
  -- Kanıt birimleri: (kaynak, d, n, f, ham soru, tip)
  ev as (
    select 'oturum'::text as src, s.d, s.n,
           least(s.n, (s.wrong - coalesce(t.k, 0)) * prm.pen_full + coalesce(t.pen, 0) + s.empty * prm.empty_pen) as f,
           s.n::int as raw, null::text as et
      from sess s
      cross join params prm
      left join typed t on t.sid = s.id
    union all
    select 'deneme', e.date, prm.exam_w, prm.exam_w * public.upplan_penalty(w.error_type), 1, w.error_type
      from public.wrong_answers w
      join public.exams e on e.id = w.exam_id
      cross join params prm
     where w.student_id = p_student_id
       and w.topic_id = p_topic_id
       and e.date <= prm.as_of
    union all
    select 'bagimsiz', coalesce(s.date, (w.created_at at time zone 'Europe/Istanbul')::date),
           1, public.upplan_penalty(w.error_type), 1, w.error_type
      from public.wrong_answers w
      left join public.study_sessions s on s.id = w.study_session_id
      cross join params prm
     where w.student_id = p_student_id
       and w.topic_id = p_topic_id
       and w.exam_id is null
       and (w.study_session_id is null or s.topic_id is null)
       and coalesce(s.date, (w.created_at at time zone 'Europe/Istanbul')::date) <= prm.as_of
  ),
  weighted as (
    select ev.*, power(0.5::numeric, greatest(prm.as_of - ev.d, 0)::numeric / prm.hl) as lam
      from ev cross join params prm
  ),
  agg as (
    select coalesce(sum(lam * n), 0) as wn,
           coalesce(sum(lam * (n - f)), 0) as ws,
           coalesce(sum(raw), 0)::int as raw_n,
           max(d) as last_d,
           coalesce(sum(n) filter (where src = 'oturum'), 0)::int as sess_q,
           sum(lam * (n - f)) filter (where src = 'oturum') as sess_ws,
           sum(lam * n) filter (where src = 'oturum') as sess_wn,
           count(*) filter (where src = 'oturum')::int as sess_count,
           count(*) filter (where src = 'deneme')::int as exam_wrongs,
           count(*) filter (where src = 'bagimsiz')::int as loose_wrongs
      from weighted
  ),
  notebook as (
    -- Yanlış defteri tip dağılımı (oturum + deneme + bağımsız; açıklama için)
    select coalesce(jsonb_object_agg(coalesce(error_type, 'belirtilmedi'), cnt), '{}'::jsonb) as by_type
      from (
        select w.error_type, count(*)::int as cnt
          from public.wrong_answers w
          left join public.study_sessions s on s.id = w.study_session_id
          left join public.exams e on e.id = w.exam_id
          cross join params prm
         where w.student_id = p_student_id
           and w.topic_id = p_topic_id
           and coalesce(s.date, e.date, (w.created_at at time zone 'Europe/Istanbul')::date) <= prm.as_of
         group by w.error_type
      ) x
  )
  select round(100 * (pr.w0 * pr.p0 + a.ws) / (pr.w0 + a.wn), 2),
         a.raw_n,
         round(a.wn, 3),
         a.last_d,
         exists (select 1 from sa),
         jsonb_build_object(
           'assessment', (select status from sa),
           'prior', round(pr.p0 * 100, 2),
           'prior_weight', pr.w0,
           'session_count', a.sess_count,
           'session_questions', a.sess_q,
           'session_accuracy', case when a.sess_wn > 0 then round(100 * a.sess_ws / a.sess_wn, 1) end,
           'exam_wrongs', a.exam_wrongs,
           'loose_wrongs', a.loose_wrongs,
           'wrongs_by_type', nb.by_type
         )
    from agg a cross join prior pr cross join notebook nb
$$;

-- ── 4) Yazma ─────────────────────────────────────────────────────────────
create or replace function public.recompute_topic_mastery(p_student_id uuid, p_topic_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if p_student_id is null or p_topic_id is null then
    return;
  end if;

  select * into r from public.compute_topic_mastery(p_student_id, p_topic_id, null);

  -- Ne tarama ne kanıt → satır tutulmaz (okurken öncül 40 varsayılır).
  if not r.has_assessment and r.evidence_n = 0 then
    delete from public.student_topic_mastery where student_id = p_student_id and topic_id = p_topic_id;
    return;
  end if;

  insert into public.student_topic_mastery
    (student_id, topic_id, mastery, confidence, evidence_n, evidence_w, last_practiced_at, breakdown, updated_at)
  values
    (p_student_id, p_topic_id, r.mastery, public.upplan_confidence(r.evidence_w), r.evidence_n, r.evidence_w,
     r.last_practiced_at, r.breakdown, now())
  on conflict (student_id, topic_id) do update
    set mastery = excluded.mastery,
        confidence = excluded.confidence,
        evidence_n = excluded.evidence_n,
        evidence_w = excluded.evidence_w,
        last_practiced_at = excluded.last_practiced_at,
        breakdown = excluded.breakdown,
        updated_at = now();
end;
$$;

revoke execute on function public.recompute_topic_mastery(uuid, uuid) from public, anon, authenticated;

create or replace function public.upplan_recompute_student(p_student_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_topic uuid;
  v_n integer := 0;
begin
  for v_topic in
    select topic_id from public.study_sessions where student_id = p_student_id and topic_id is not null
    union
    select topic_id from public.wrong_answers where student_id = p_student_id
    union
    select topic_id from public.student_topic_self_assessment where student_id = p_student_id
    union
    select topic_id from public.student_topic_mastery where student_id = p_student_id
  loop
    perform public.recompute_topic_mastery(p_student_id, v_topic);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

revoke execute on function public.upplan_recompute_student(uuid) from public, anon, authenticated;

-- Toplu yeniden hesap (öğrencinin kendisi, koçu, admin).
create or replace function public.recompute_student_mastery(p_student_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;
  if not (p_student_id = auth.uid()
          or public.is_coach_of(p_student_id)
          or public.current_user_role() = 'admin') then
    raise exception 'Yetkisiz işlem.' using errcode = '42501';
  end if;
  return public.upplan_recompute_student(p_student_id);
end;
$$;

revoke execute on function public.recompute_student_mastery(uuid) from public, anon;
grant execute on function public.recompute_student_mastery(uuid) to authenticated;

-- ── 5) Tetikleyiciler (statement-level, transition tables) ───────────────
-- Toplu insert'te (ör. 30 yanlış) her (öğrenci, konu) çifti bir kez hesaplanır.
create or replace function public.upplan_mastery_pairs_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if tg_op = 'INSERT' then
    for r in select distinct student_id, topic_id from new_rows where topic_id is not null loop
      perform public.recompute_topic_mastery(r.student_id, r.topic_id);
    end loop;
  elsif tg_op = 'UPDATE' then
    for r in
      select student_id, topic_id from new_rows where topic_id is not null
      union
      select student_id, topic_id from old_rows where topic_id is not null
    loop
      perform public.recompute_topic_mastery(r.student_id, r.topic_id);
    end loop;
  else
    for r in select distinct student_id, topic_id from old_rows where topic_id is not null loop
      perform public.recompute_topic_mastery(r.student_id, r.topic_id);
    end loop;
  end if;
  return null;
end;
$$;

-- Deneme tarihi değişince o denemenin yanlış konuları.
create or replace function public.upplan_mastery_exam_date_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select distinct w.student_id, w.topic_id
      from public.wrong_answers w
      join new_rows n on n.id = w.exam_id
      join old_rows o on o.id = n.id
     where n.date is distinct from o.date
  loop
    perform public.recompute_topic_mastery(r.student_id, r.topic_id);
  end loop;
  return null;
end;
$$;

revoke execute on function public.upplan_mastery_pairs_trigger() from public, anon, authenticated;
revoke execute on function public.upplan_mastery_exam_date_trigger() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['study_sessions', 'wrong_answers', 'student_topic_self_assessment'] loop
    execute format('drop trigger if exists trg_%s_mastery_ins on public.%I', t, t);
    execute format('drop trigger if exists trg_%s_mastery_upd on public.%I', t, t);
    execute format('drop trigger if exists trg_%s_mastery_del on public.%I', t, t);
    execute format(
      'create trigger trg_%s_mastery_ins after insert on public.%I referencing new table as new_rows
         for each statement execute function public.upplan_mastery_pairs_trigger()', t, t);
    execute format(
      'create trigger trg_%s_mastery_upd after update on public.%I referencing old table as old_rows new table as new_rows
         for each statement execute function public.upplan_mastery_pairs_trigger()', t, t);
    execute format(
      'create trigger trg_%s_mastery_del after delete on public.%I referencing old table as old_rows
         for each statement execute function public.upplan_mastery_pairs_trigger()', t, t);
  end loop;
end;
$$;

drop trigger if exists trg_exams_mastery_date on public.exams;
create trigger trg_exams_mastery_date
  after update on public.exams
  referencing old table as old_rows new table as new_rows
  for each statement execute function public.upplan_mastery_exam_date_trigger();

-- ── 6) Okuma RPC'leri (SECURITY INVOKER → RLS kapsamı) ───────────────────
create or replace function public.student_mastery_map(p_student_id uuid)
returns table(
  topic_id uuid,
  subject_id uuid,
  stored numeric,
  effective numeric,
  label text,
  confidence text,
  evidence_n integer,
  last_practiced_at date,
  forgetting boolean,
  breakdown jsonb
)
language sql
stable
set search_path = public
as $$
  select m.topic_id,
         t.subject_id,
         m.mastery,
         e.eff,
         case
           when e.eff >= public.upplan_cfg('label_iyi') then 'iyi'
           when e.eff >= public.upplan_cfg('label_gelisiyor') then 'gelisiyor'
           else 'zayif'
         end,
         m.confidence,
         m.evidence_n,
         m.last_practiced_at,
         e.eff < m.mastery * public.upplan_cfg('forgetting_flag_ratio'),
         m.breakdown
    from public.student_topic_mastery m
    join public.topics t on t.id = m.topic_id
    cross join lateral (select public.effective_mastery(m.mastery, m.last_practiced_at, null) as eff) e
   where m.student_id = p_student_id
$$;

-- Haftalık trend: her hafta sonu (Pazar; içinde bulunulan hafta için bugün)
-- itibarıyla etkili skor. Kanıtsız (yalnız taramalı) konular sabit olduğundan
-- saklanan değerle katılır, yeniden hesaplanmaz.
create or replace function public.student_mastery_trend(p_student_id uuid, p_weeks integer default 8)
returns table(week_end date, subject_id uuid, topic_count integer, sum_effective numeric)
language sql
stable
set search_path = public
as $$
  with today as (
    select (now() at time zone 'Europe/Istanbul')::date as d
  ),
  weeks as (
    select least(
             (date_trunc('week', today.d)::date + 6) - 7 * g,
             today.d
           ) as we
      from today, generate_series(0, greatest(p_weeks, 1) - 1) g
  ),
  mrows as (
    select m.topic_id, t.subject_id, m.mastery, m.last_practiced_at
      from public.student_topic_mastery m
      join public.topics t on t.id = m.topic_id
     where m.student_id = p_student_id
  ),
  per_topic as (
    select w.we, r.subject_id,
           case
             when r.last_practiced_at is null then r.mastery
             else (
               select public.effective_mastery(c.mastery, c.last_practiced_at, w.we)
                 from public.compute_topic_mastery(p_student_id, r.topic_id, w.we) c
             )
           end as eff
      from weeks w cross join mrows r
  )
  select we, subject_id, count(*)::int, round(sum(eff), 2)
    from per_topic
   group by we, subject_id
   order by we
$$;

-- "biliyorum" dediği, deneme kanıtı olan ve etkili skoru eşik altı konular.
create or replace function public.student_overconfident_topics(p_student_id uuid)
returns table(topic_id uuid, topic_name text, subject_name text, effective numeric)
language sql
stable
set search_path = public
as $$
  select m.topic_id, t.name, s.name, public.effective_mastery(m.mastery, m.last_practiced_at, null)
    from public.student_topic_mastery m
    join public.student_topic_self_assessment a
      on a.student_id = m.student_id and a.topic_id = m.topic_id and a.status = 'biliyorum'
    join public.topics t on t.id = m.topic_id
    join public.subjects s on s.id = t.subject_id
   where m.student_id = p_student_id
     and coalesce((m.breakdown->>'exam_wrongs')::int, 0) > 0
     and public.effective_mastery(m.mastery, m.last_practiced_at, null) < public.upplan_cfg('overconfident_threshold')
   order by 4
$$;

-- ── 7) Bir kerelik backfill ──────────────────────────────────────────────
do $$
declare
  v_student uuid;
begin
  for v_student in select id from public.students loop
    perform public.upplan_recompute_student(v_student);
  end loop;
end;
$$;
