-- ─────────────────────────────────────────────────────────────────────────
-- 215 — Konudan bağımsız atom seçimi (çapraz konulu yanlış)
-- ─────────────────────────────────────────────────────────────────────────
-- Bir sorunun eksik bilgisi çoğu zaman başka bir konudadır (Bölünebilme
-- testindeki yanlışın sebebi "Asal Sayılar" atomu olabilir). Bundan sonra:
--
--   * wrong_answers.topic_id = sorunun ÇÖZÜLDÜĞÜ konu (değişmez).
--   * knowledge_atom_id, kaydın konusuyla AYNI DERS GRUBUNDAN herhangi bir
--     konunun atomu olabilir. Atomun konusu knowledge_atoms.topic_id'den okunur.
--   * Ders grubu: aynı alanın TYT/AYT dersleri (subject_groups). Grupta
--     olmayan ders tek başına bir gruptur. Kaynak: lib/curriculum/subject-groups.ts
--     (subject-groups.test.ts bu dosyadaki listeyle karşılaştırır).
--
-- ANALİZ ETKİSİ
--   a) student_gap_map: atom, KENDİ konusu altında listelenir (önce satırın
--      konusu altında sayılıyordu; çapraz kayıt yokken ikisi aynı).
--      Zayıflık skoru paydası:
--        n_atom = n_konu + x     (x = başka konulardaki sorulardan gelen yanlış)
--        score  = (w + m·p0) / (n_atom + m)
--      Kaynak konuda çözülen soruların tamamı paydaya EKLENMEZ: Bölünebilme
--      testinin çoğu sorusu asal sayı bilgisini ölçmez, eklemek açığı
--      seyreltirdi. Ama çapraz yanlışın kendisi bu atomu gerçekten içeren bir
--      sorudur → paydaya +1. Böylece w ≤ n_atom olur, skor ≤ 1 kalır (atomun
--      konusunda hiç soru çözülmemişken w/m ile 1'i aşabilirdi). Güven
--      etiketi yine atomun konusunda çözülen soruya (n_konu) göre.
--      Kaynak konu kırılımı: student_gap_cross_sources (drill-down etiketi).
--   b) Ustalık (compute_topic_mastery): sorunun doğruluk kanıtı çözüldüğü
--      konuda kalır (değişmez). Çapraz yanlış ATOMUN konusuna yeni bir kanıt
--      birimi olarak HAFİF yansır: n = cross_atom_weight (0.5),
--      f = n · c(tip). Çift sayım yok: aynı satır kaynak konuda zaten sayılır,
--      atomun konusunda ise yalnız bu yolla (atom konusu = satır konusu ise
--      'capraz' değildir, hiç eklenmez) ve satır başına bir kez.
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1) Ders grupları ─────────────────────────────────────────────────────
create table if not exists public.subject_groups (
  subject_id uuid primary key references public.subjects(id) on delete cascade,
  group_key  text not null check (length(trim(group_key)) > 0)
);

create index if not exists subject_groups_group_key_idx on public.subject_groups (group_key);

alter table public.subject_groups enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'subject_groups' and policyname = 'subject_groups_read_all'
  ) then
    create policy "subject_groups_read_all" on public.subject_groups for select using (true);
  end if;
end;
$$;
-- INSERT/UPDATE/DELETE policy'si YOK → yalnız migration yazar.

insert into public.subject_groups (subject_id, group_key)
select s.id, v.group_key
  from public.subjects s
  join (values
    ('TYT Matematik', 'matematik'),
    ('AYT Matematik', 'matematik'),
    ('TYT Geometri', 'matematik'),
    ('AYT Geometri', 'matematik'),
    ('TYT Fizik', 'fizik'),
    ('AYT Fizik', 'fizik'),
    ('TYT Kimya', 'kimya'),
    ('AYT Kimya', 'kimya'),
    ('TYT Biyoloji', 'biyoloji'),
    ('AYT Biyoloji', 'biyoloji'),
    ('TYT Tarih', 'tarih'),
    ('AYT Tarih', 'tarih'),
    ('TYT Coğrafya', 'cografya'),
    ('AYT Coğrafya', 'cografya'),
    ('TYT Felsefe', 'felsefe'),
    ('AYT Felsefe', 'felsefe'),
    ('AYT Sosyoloji', 'felsefe'),
    ('TYT Din Kültürü', 'din'),
    ('AYT Din Kültürü', 'din')
  ) as v(subject_name, group_key) on v.subject_name = s.name
on conflict (subject_id) do update set group_key = excluded.group_key;

create or replace function public.subject_group_key(p_subject_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select g.group_key from public.subject_groups g where g.subject_id = p_subject_id),
    p_subject_id::text
  )
$$;

-- ── 2) Katsayı: çapraz yanlışın atom konusuna ağırlığı ──────────────────
insert into public.upplan_config (key, value, note) values
  ('cross_atom_weight', 0.5, 'Başka konudaki sorunun yanlışı bu konunun atomuna bağlıysa: soru eşdeğeri ağırlık')
on conflict (key) do update set value = excluded.value, note = excluded.note;

-- ── 3) Tutarlılık: atom ↔ ders grubu ─────────────────────────────────────
create or replace function public.wrong_answers_consistency()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_sess record;
  v_exam record;
  v_count integer;
  v_atom_subject uuid;
  v_row_subject uuid;
  v_subject uuid;
  v_limit integer;
begin
  if new.study_session_id is not null then
    select student_id, topic_id, wrong into v_sess
      from public.study_sessions where id = new.study_session_id;
    if not found then
      raise exception 'Soru kaydı bulunamadı.' using errcode = '23503';
    end if;
    new.student_id := v_sess.student_id;
    if v_sess.topic_id is not null then
      new.topic_id := v_sess.topic_id;
    end if;

    select count(*) into v_count
      from public.wrong_answers
     where study_session_id = new.study_session_id and id <> new.id;
    if v_count + 1 > v_sess.wrong then
      raise exception 'Bu soru kaydında en fazla % yanlış girilebilir.', v_sess.wrong
        using errcode = '23514';
    end if;
  end if;

  if new.exam_id is not null then
    select student_id into v_exam from public.exams where id = new.exam_id;
    if not found then
      raise exception 'Deneme bulunamadı.' using errcode = '23503';
    end if;
    new.student_id := v_exam.student_id;

    select subject_id into v_subject from public.topics where id = new.topic_id;
    select r.wrong into v_limit
      from public.exam_results r
     where r.exam_id = new.exam_id and r.subject_id = v_subject;
    if v_limit is null then
      raise exception 'Bu konunun dersi bu denemede yok.' using errcode = '23514';
    end if;

    select count(*) into v_count
      from public.wrong_answers w
      join public.topics t on t.id = w.topic_id
     where w.exam_id = new.exam_id and t.subject_id = v_subject and w.id <> new.id;
    if v_count + 1 > v_limit then
      raise exception 'Bu denemede bu derste en fazla % yanlış dağıtılabilir.', v_limit
        using errcode = '23514';
    end if;
  end if;

  -- Atom başka bir konudan olabilir; aynı ders grubundan olmalı (215).
  if new.knowledge_atom_id is not null then
    select t.subject_id into v_atom_subject
      from public.knowledge_atoms a
      join public.topics t on t.id = a.topic_id
     where a.id = new.knowledge_atom_id;
    select subject_id into v_row_subject from public.topics where id = new.topic_id;
    if v_atom_subject is null
       or public.subject_group_key(v_atom_subject) is distinct from public.subject_group_key(v_row_subject) then
      raise exception 'Seçilen bilgi atomu bu dersin konularından değil.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

-- ── 4) Açık haritası: atom kendi konusunda, payda n_konu + x ─────────────
-- Dönüş tipi aynı (CREATE OR REPLACE); kaynak konu kırılımı ayrı fonksiyonda.
create or replace function public.student_gap_map(p_student_id uuid, p_since date default null)
returns table(atom_id uuid, atom_name text, atom_type text, atom_sort integer, topic_id uuid, topic_name text, subject_id uuid, subject_name text, wrong_count integer, topic_questions integer, subject_wrong_rate numeric, atoms_in_topic integer, score numeric, confidence text, prerequisite_ids uuid[])
language sql
stable
set search_path = public
as $$
  with params as (
    select 10::numeric as m,
           0.25::numeric as p_default
  ),
  sess as (
    select s.id, s.subject_id, s.topic_id, s.total_questions, s.wrong, s.date
      from public.study_sessions s
     where s.student_id = p_student_id
       and (p_since is null or s.date >= p_since)
  ),
  subj as (
    select subject_id, sum(wrong)::numeric / nullif(sum(total_questions), 0) as p_s
      from sess group by subject_id
  ),
  topic_q as (
    select topic_id, sum(total_questions)::int as n
      from sess where topic_id is not null group by topic_id
  ),
  wrongs as (
    select w.topic_id, w.knowledge_atom_id
      from public.wrong_answers w
      left join public.study_sessions s on s.id = w.study_session_id
      left join public.exams e on e.id = w.exam_id
     where w.student_id = p_student_id
       and (p_since is null
            or coalesce(s.date, e.date, (w.created_at at time zone 'Europe/Istanbul')::date) >= p_since)
  ),
  -- Atom başına: toplam yanlış (w) ve başka konudaki sorulardan gelen (x).
  wa as (
    select ka.id as atom_id,
           ka.topic_id as atom_topic_id,
           count(*)::int as w,
           count(*) filter (where wr.topic_id <> ka.topic_id)::int as x
      from wrongs wr
      join public.knowledge_atoms ka on ka.id = wr.knowledge_atom_id
     group by ka.id, ka.topic_id
  ),
  active_topics as (
    -- Soru çözülen, yanlış girilen ya da yanlış atomunun ait olduğu konular.
    select topic_id from topic_q
    union
    select topic_id from wrongs
    union
    select atom_topic_id from wa
  ),
  atoms as (
    select a.*, count(*) over (partition by a.topic_id)::int as k
      from public.knowledge_atoms a
     where a.topic_id in (select topic_id from active_topics)
  )
  select a.id,
         a.name,
         a.type,
         a.sort_order,
         t.id,
         t.name,
         sb.id,
         sb.name,
         coalesce(wa.w, 0),
         coalesce(tq.n, 0),
         round(coalesce(subj.p_s, prm.p_default), 4),
         a.k,
         round(
           (coalesce(wa.w, 0) + prm.m * coalesce(subj.p_s, prm.p_default) / a.k)
           / (coalesce(tq.n, 0) + coalesce(wa.x, 0) + prm.m),
           4
         ),
         case
           when coalesce(tq.n, 0) < 20 then 'yetersiz'
           when tq.n < 50 then 'dusuk'
           when tq.n < 150 then 'orta'
           else 'yuksek'
         end,
         coalesce(
           (select array_agg(p.prerequisite_atom_id) from public.knowledge_atom_prerequisites p where p.atom_id = a.id),
           '{}'::uuid[]
         )
    from atoms a
    cross join params prm
    join public.topics t on t.id = a.topic_id
    join public.subjects sb on sb.id = t.subject_id
    left join topic_q tq on tq.topic_id = a.topic_id
    left join wa on wa.atom_id = a.id
    left join subj on subj.subject_id = t.subject_id
$$;

-- Drill-down etiketi: atoma başka konulardaki sorulardan gelen yanlışlar.
create or replace function public.student_gap_cross_sources(p_student_id uuid, p_since date default null)
returns table(atom_id uuid, source_topic_id uuid, source_topic_name text, cnt integer)
language sql
stable
set search_path = public
as $$
  select ka.id, t.id, t.name, count(*)::int
    from public.wrong_answers w
    join public.knowledge_atoms ka on ka.id = w.knowledge_atom_id
    join public.topics t on t.id = w.topic_id
    left join public.study_sessions s on s.id = w.study_session_id
    left join public.exams e on e.id = w.exam_id
   where w.student_id = p_student_id
     and w.topic_id <> ka.topic_id
     and (p_since is null
          or coalesce(s.date, e.date, (w.created_at at time zone 'Europe/Istanbul')::date) >= p_since)
   group by ka.id, t.id, t.name
$$;

revoke all on function public.student_gap_cross_sources(uuid, date) from public, anon;
grant execute on function public.student_gap_cross_sources(uuid, date) to authenticated;

-- ── 5) Ustalık: çapraz yanlış atomun konusuna hafif sinyal ───────────────
create or replace function public.compute_topic_mastery(p_student_id uuid, p_topic_id uuid, p_as_of date default null)
returns table(mastery numeric, evidence_n integer, evidence_w numeric, last_practiced_at date, has_assessment boolean, breakdown jsonb)
language sql
stable
set search_path = public
as $$
  with params as (
    select coalesce(p_as_of, (now() at time zone 'Europe/Istanbul')::date) as as_of,
           public.upplan_cfg('evidence_half_life_days') as hl,
           public.upplan_cfg('exam_wrong_weight') as exam_w,
           public.upplan_cfg('penalty_full') as pen_full,
           public.upplan_cfg('empty_penalty') as empty_pen,
           public.upplan_cfg('cross_atom_weight') as cross_w
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
    union all
    -- Çapraz (215): başka konudaki sorunun yanlışı bu konunun atomuna bağlı.
    -- Satırın kendi konusundaki kanıtı yukarıdaki kollarda; burada yalnız
    -- atomun konusuna, satır başına bir kez, hafif ağırlıkla.
    select 'capraz', coalesce(s.date, e.date, (w.created_at at time zone 'Europe/Istanbul')::date),
           prm.cross_w, prm.cross_w * public.upplan_penalty(w.error_type), 1, w.error_type
      from public.wrong_answers w
      join public.knowledge_atoms ka on ka.id = w.knowledge_atom_id
      left join public.study_sessions s on s.id = w.study_session_id
      left join public.exams e on e.id = w.exam_id
      cross join params prm
     where w.student_id = p_student_id
       and ka.topic_id = p_topic_id
       and w.topic_id <> p_topic_id
       and coalesce(s.date, e.date, (w.created_at at time zone 'Europe/Istanbul')::date) <= prm.as_of
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
           count(*) filter (where src = 'bagimsiz')::int as loose_wrongs,
           count(*) filter (where src = 'capraz')::int as cross_wrongs
      from weighted
  ),
  notebook as (
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
         ) || case when a.cross_wrongs > 0 then jsonb_build_object('cross_wrongs', a.cross_wrongs) else '{}'::jsonb end
    from agg a cross join prior pr cross join notebook nb
$$;

-- ── 6) Yeniden hesap tetikleyicileri: atomun konusu da ───────────────────
create or replace function public.upplan_mastery_pairs_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  -- wrong_answers'ta çapraz atomun konusu da etkilenir (215). Diğer
  -- tablolarda knowledge_atom_id kolonu yok; o sorgular hiç çalıştırılmaz.
  v_atoms boolean := tg_table_name = 'wrong_answers';
begin
  if tg_op = 'INSERT' then
    for r in select distinct student_id, topic_id from new_rows where topic_id is not null loop
      perform public.recompute_topic_mastery(r.student_id, r.topic_id);
    end loop;
    if v_atoms then
      for r in
        select distinct n.student_id, ka.topic_id
          from new_rows n join public.knowledge_atoms ka on ka.id = n.knowledge_atom_id
         where ka.topic_id <> n.topic_id
      loop
        perform public.recompute_topic_mastery(r.student_id, r.topic_id);
      end loop;
    end if;
  elsif tg_op = 'UPDATE' then
    for r in
      select student_id, topic_id from new_rows where topic_id is not null
      union
      select student_id, topic_id from old_rows where topic_id is not null
    loop
      perform public.recompute_topic_mastery(r.student_id, r.topic_id);
    end loop;
    if v_atoms then
      for r in
        select n.student_id, ka.topic_id
          from new_rows n join public.knowledge_atoms ka on ka.id = n.knowledge_atom_id
         where ka.topic_id <> n.topic_id
        union
        select o.student_id, ka.topic_id
          from old_rows o join public.knowledge_atoms ka on ka.id = o.knowledge_atom_id
         where ka.topic_id <> o.topic_id
      loop
        perform public.recompute_topic_mastery(r.student_id, r.topic_id);
      end loop;
    end if;
  else
    for r in select distinct student_id, topic_id from old_rows where topic_id is not null loop
      perform public.recompute_topic_mastery(r.student_id, r.topic_id);
    end loop;
    if v_atoms then
      for r in
        select distinct o.student_id, ka.topic_id
          from old_rows o join public.knowledge_atoms ka on ka.id = o.knowledge_atom_id
         where ka.topic_id <> o.topic_id
      loop
        perform public.recompute_topic_mastery(r.student_id, r.topic_id);
      end loop;
    end if;
  end if;
  return null;
end;
$$;

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
    select w.student_id, w.topic_id
      from public.wrong_answers w
      join new_rows n on n.id = w.exam_id
      join old_rows o on o.id = n.id
     where n.date is distinct from o.date
    union
    select w.student_id, ka.topic_id
      from public.wrong_answers w
      join public.knowledge_atoms ka on ka.id = w.knowledge_atom_id
      join new_rows n on n.id = w.exam_id
      join old_rows o on o.id = n.id
     where n.date is distinct from o.date
       and ka.topic_id <> w.topic_id
  loop
    perform public.recompute_topic_mastery(r.student_id, r.topic_id);
  end loop;
  return null;
end;
$$;

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
    select ka.topic_id
      from public.wrong_answers w join public.knowledge_atoms ka on ka.id = w.knowledge_atom_id
     where w.student_id = p_student_id
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
