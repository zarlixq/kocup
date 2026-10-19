-- ─────────────────────────────────────────────────────────────────────────
-- 208 — Yanlış defteri: deneme kaynağı
-- ─────────────────────────────────────────────────────────────────────────
-- Deneme kaydedilince öğrenci ders ders yanlışlarını konulara dağıtır.
--   * wrong_answers.exam_id (soru kaydı ile ikisi birden dolu olamaz)
--   * deneme yanlışında hata tipi opsiyonel (error_type null = belirtilmedi)
--   * bir dersin dağıtılan yanlışı ≤ o dersin exam_results.wrong
--   * set_exam_wrong_answers(): tek transaction'da uzlaştırma (notlar korunur)
--   * exam_results düzenlenince (update_exam_with_results sil+ekle yapar)
--     DEFERRED kontrol: ders tamamen çıkarıldıysa o dersin deneme yanlışları
--     silinir; yanlış sayısı dağıtılanın altına indiyse hata.
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1) Kolon + kısıtlar ──────────────────────────────────────────────────
alter table public.wrong_answers
  add column if not exists exam_id uuid references public.exams(id) on delete cascade;

create index if not exists wrong_answers_exam_id_idx on public.wrong_answers (exam_id) where exam_id is not null;

alter table public.wrong_answers alter column error_type drop not null;

alter table public.wrong_answers
  drop constraint if exists wrong_answers_single_source_check,
  add constraint wrong_answers_single_source_check
    check (study_session_id is null or exam_id is null),
  drop constraint if exists wrong_answers_error_type_required_check,
  add constraint wrong_answers_error_type_required_check
    check (error_type is not null or exam_id is not null);

-- ── 2) Tutarlılık trigger'ı (oturum + deneme) ────────────────────────────
create or replace function public.wrong_answers_consistency()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_sess record;
  v_exam record;
  v_count integer;
  v_atom_topic uuid;
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

  if new.knowledge_atom_id is not null then
    select topic_id into v_atom_topic from public.knowledge_atoms where id = new.knowledge_atom_id;
    if v_atom_topic is distinct from new.topic_id then
      raise exception 'Seçilen bilgi atomu bu konuya ait değil.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

-- ── 3) exam_results düzenleme kontrolü (commit anında) ───────────────────
create or replace function public.exam_results_wrong_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exam uuid := coalesce(new.exam_id, old.exam_id);
  v_bad record;
begin
  -- Denemeden tamamen çıkarılan dersin dağıtılmış yanlışları silinir.
  delete from public.wrong_answers w
   using public.topics t
   where w.exam_id = v_exam
     and t.id = w.topic_id
     and not exists (
       select 1 from public.exam_results r
        where r.exam_id = v_exam and r.subject_id = t.subject_id
     );

  select r.wrong, count(w.id) as n, s.name into v_bad
    from public.exam_results r
    join public.subjects s on s.id = r.subject_id
    join public.topics t on t.subject_id = r.subject_id
    join public.wrong_answers w on w.topic_id = t.id and w.exam_id = v_exam
   where r.exam_id = v_exam
   group by r.subject_id, r.wrong, s.name
  having count(w.id) > r.wrong
   limit 1;
  if found then
    raise exception '% dersinde % yanlış konulara dağıtılmış; yanlış sayısını bunun altına indirmeden önce dağıtımı güncelle.',
      v_bad.name, v_bad.n
      using errcode = '23514';
  end if;
  return null;
end;
$$;

revoke execute on function public.exam_results_wrong_guard() from public, anon, authenticated;

drop trigger if exists trg_exam_results_wrong_guard on public.exam_results;
create constraint trigger trg_exam_results_wrong_guard
  after insert or update or delete on public.exam_results
  deferrable initially deferred
  for each row execute function public.exam_results_wrong_guard();

-- ── 4) Dağıtım RPC'si ────────────────────────────────────────────────────
-- p_items: [{topic_id, error_type|null, knowledge_atom_id|null, count}]
-- İstenen durum ile mevcut satırlar uzlaştırılır: fazlası silinir (notsuz ve
-- eski olanlar önce), eksik olanlar eklenir. Listede olmayan grup → silinir.
create or replace function public.set_exam_wrong_answers(p_exam_id uuid, p_items jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_exam record;
  v_bad text;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Geçersiz yanlış listesi.';
  end if;

  select id, student_id into v_exam from public.exams where id = p_exam_id;
  if not found or v_exam.student_id is distinct from auth.uid() then
    raise exception 'Deneme bulunamadı.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) x
     where coalesce((x->>'count')::int, -1) < 0
        or nullif(x->>'topic_id', '') is null
        or (nullif(x->>'error_type', '') is not null
            and x->>'error_type' not in ('bilgi_eksik', 'islem_hatasi', 'dikkat_okuma', 'sure_yetmedi', 'hic_fikrim_yok'))
  ) then
    raise exception 'Geçersiz konu, hata tipi ya da sayı.';
  end if;

  -- Ders bazında toplam ≤ dersin yanlışı (trigger da kontrol eder; burada
  -- tek ve anlaşılır mesaj için önden).
  select s.name into v_bad
    from (
      select t.subject_id, sum((x->>'count')::int) as n
        from jsonb_array_elements(p_items) x
        join public.topics t on t.id = (x->>'topic_id')::uuid
       group by t.subject_id
    ) d
    join public.subjects s on s.id = d.subject_id
    left join public.exam_results r on r.exam_id = p_exam_id and r.subject_id = d.subject_id
   where d.n > coalesce(r.wrong, 0)
   limit 1;
  if v_bad is not null then
    raise exception '% dersinde yanlış sayısından fazla dağıtım yapılamaz.', v_bad;
  end if;

  with desired as (
    select (x->>'topic_id')::uuid as topic,
           nullif(x->>'error_type', '') as et,
           nullif(x->>'knowledge_atom_id', '')::uuid as atom,
           sum((x->>'count')::int) as cnt
      from jsonb_array_elements(p_items) x
     group by 1, 2, 3
  ),
  ranked as (
    select w.id, w.topic_id, w.error_type, w.knowledge_atom_id,
           row_number() over (
             partition by w.topic_id, w.error_type, w.knowledge_atom_id
             order by (w.note is null), w.created_at
           ) as rn
      from public.wrong_answers w
     where w.exam_id = p_exam_id
  )
  delete from public.wrong_answers w
   using ranked r
   left join desired d
     on d.topic = r.topic_id
    and d.et is not distinct from r.error_type
    and d.atom is not distinct from r.knowledge_atom_id
   where w.id = r.id
     and r.rn > coalesce(d.cnt, 0);

  with desired as (
    select (x->>'topic_id')::uuid as topic,
           nullif(x->>'error_type', '') as et,
           nullif(x->>'knowledge_atom_id', '')::uuid as atom,
           sum((x->>'count')::int) as cnt
      from jsonb_array_elements(p_items) x
     group by 1, 2, 3
  ),
  missing as (
    select d.topic, d.et, d.atom,
           d.cnt - (
             select count(*) from public.wrong_answers w
              where w.exam_id = p_exam_id
                and w.topic_id = d.topic
                and w.error_type is not distinct from d.et
                and w.knowledge_atom_id is not distinct from d.atom
           ) as n
      from desired d
  )
  insert into public.wrong_answers (student_id, exam_id, topic_id, knowledge_atom_id, error_type)
  select auth.uid(), p_exam_id, m.topic, m.atom, m.et
    from missing m
    cross join lateral generate_series(1, greatest(m.n, 0));
end;
$$;

-- ── 5) Açık haritası fonksiyonları: deneme tarihi + tipsiz satırlar ──────
-- Tarih: oturum tarihi → deneme tarihi → kayıt tarihi. Tip dağılımı/trendi
-- yalnız tipi belirtilmiş yanlışları sayar.
create or replace function public.student_error_distribution(p_student_id uuid, p_since date default null)
returns table(subject_id uuid, subject_name text, topic_id uuid, topic_name text, error_type text, cnt integer)
language sql
stable
set search_path = public
as $$
  select sb.id, sb.name, t.id, t.name, w.error_type, count(*)::int
    from public.wrong_answers w
    left join public.study_sessions s on s.id = w.study_session_id
    left join public.exams e on e.id = w.exam_id
    join public.topics t on t.id = w.topic_id
    join public.subjects sb on sb.id = t.subject_id
   where w.student_id = p_student_id
     and w.error_type is not null
     and (p_since is null
          or coalesce(s.date, e.date, (w.created_at at time zone 'Europe/Istanbul')::date) >= p_since)
   group by sb.id, sb.name, t.id, t.name, w.error_type
$$;

create or replace function public.student_gap_trend(p_student_id uuid, p_weeks integer default 4)
returns table(week_start date, error_type text, cnt integer)
language sql
stable
set search_path = public
as $$
  with bounds as (
    select (date_trunc('week', (now() at time zone 'Europe/Istanbul'))::date
            - (greatest(p_weeks, 1) - 1) * 7) as first_week
  ),
  dated as (
    select w.error_type,
           coalesce(s.date, e.date, (w.created_at at time zone 'Europe/Istanbul')::date) as d
      from public.wrong_answers w
      left join public.study_sessions s on s.id = w.study_session_id
      left join public.exams e on e.id = w.exam_id
     where w.student_id = p_student_id
       and w.error_type is not null
  )
  select date_trunc('week', d)::date, error_type, count(*)::int
    from dated, bounds
   where d >= bounds.first_week
   group by 1, 2
$$;

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
  wa as (
    select w.knowledge_atom_id as atom_id, w.topic_id, count(*)::int as w
      from public.wrong_answers w
      left join public.study_sessions s on s.id = w.study_session_id
      left join public.exams e on e.id = w.exam_id
     where w.student_id = p_student_id
       and (p_since is null
            or coalesce(s.date, e.date, (w.created_at at time zone 'Europe/Istanbul')::date) >= p_since)
     group by w.knowledge_atom_id, w.topic_id
  ),
  active_topics as (
    select topic_id from topic_q
    union
    select topic_id from wa
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
           / (coalesce(tq.n, 0) + prm.m),
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
