-- ─────────────────────────────────────────────────────────────────────────
-- 222 — Analizim: analiz merkezi toplama fonksiyonları
-- ─────────────────────────────────────────────────────────────────────────
-- Tümü SECURITY INVOKER: kapsam çağıranın RLS'i (öğrenci kendisi, koç kendi
-- öğrencisi, kurum/müdür kendi kapsamı). Ağır toplama veritabanında; eşik ve
-- içgörü kuralları uygulamada (lib/insights.ts).
--   p_from null → tüm zamanlar. Tarihler Istanbul takvim günü.
--   analiz_overview      : KPI'lar (dönem + önceki dönem), seri, konu tamamlama
--   analiz_subjects      : ders bazlı tablo
--   analiz_topics        : konu bazlı (p_subject null → yalnız verisi olan konular)
--   analiz_daily         : günlük soru/dakika/video (takvim, haftalık trend)
--   analiz_wrong_answers : yanlış defteri dağılımları
-- ─────────────────────────────────────────────────────────────────────────

create index if not exists study_sessions_student_date_idx on public.study_sessions (student_id, date);
create index if not exists wrong_answers_student_created_idx on public.wrong_answers (student_id, created_at);

-- ── Genel bakış ──────────────────────────────────────────────────────────
create or replace function public.analiz_overview(p_student uuid, p_from date, p_to date, p_subject uuid default null)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with b as (
    select (now() at time zone 'Europe/Istanbul')::date today,
           case when p_from is null then null else p_from - (p_to - p_from + 1) end pf,
           case when p_from is null then null else p_from - 1 end pt
  ),
  ses as (
    select s.date d, s.total_questions q, s.correct c, s.wrong w, s.empty e, coalesce(s.duration_minutes, 0) m
      from public.study_sessions s
     where s.student_id = p_student and (p_subject is null or s.subject_id = p_subject)
  ),
  vid as (
    select (v.watched_at at time zone 'Europe/Istanbul')::date d, coalesce(v.duration_seconds, 0) sec
      from public.student_resource_videos v
      join public.student_resource_playlists p on p.id = v.playlist_id
     where v.student_id = p_student and v.watch_status = 'izlendi' and v.watched_at is not null
       and (p_subject is null or p.subject_id = p_subject)
  ),
  days as (select d from ses union select d from vid),
  anchor as (select max(d) a from days, b where d <= b.today),
  streak as (
    select count(*)::int n
      from (select d, row_number() over (order by d desc) rn from days, anchor where d <= anchor.a) x, anchor, b
     where anchor.a >= b.today - 1 and x.d + x.rn::int = anchor.a + 1
  ),
  tc as (
    select count(*) filter (where z.done)::int done, count(*)::int total
      from (
        select t.topic_id, bool_or(t.done) done
          from (
            select st.topic_id, st.status = 'tamam' done
              from public.student_topics st
             where st.student_id = p_student and st.topic_id is not null
            union all
            select ta.topic_id, ta.status = 'tamamlandi'
              from public.topic_assignments ta
             where ta.student_id = p_student and ta.status <> 'iptal'
          ) t
          join public.topics tp on tp.id = t.topic_id
         where p_subject is null or tp.subject_id = p_subject
         group by t.topic_id
      ) z
  )
  select jsonb_build_object(
    'cur', (
      select jsonb_build_object(
        'questions', coalesce(sum(q), 0), 'correct', coalesce(sum(c), 0), 'wrong', coalesce(sum(w), 0),
        'empty', coalesce(sum(e), 0), 'minutes', coalesce(sum(m), 0),
        'videos', (select count(*) from vid where (p_from is null or d >= p_from) and d <= p_to),
        'video_seconds', (select coalesce(sum(sec), 0) from vid where (p_from is null or d >= p_from) and d <= p_to),
        'active_days', (select count(*) from days where (p_from is null or d >= p_from) and d <= p_to))
        from ses where (p_from is null or d >= p_from) and d <= p_to),
    'prev', case when p_from is null then null else (
      select jsonb_build_object(
        'questions', coalesce(sum(q), 0), 'correct', coalesce(sum(c), 0), 'wrong', coalesce(sum(w), 0),
        'empty', coalesce(sum(e), 0), 'minutes', coalesce(sum(m), 0),
        'videos', (select count(*) from vid, b where d between b.pf and b.pt),
        'video_seconds', (select coalesce(sum(sec), 0) from vid, b where d between b.pf and b.pt),
        'active_days', (select count(*) from days, b where d between b.pf and b.pt))
        from ses, b where d between b.pf and b.pt) end,
    'streak', (select n from streak),
    'topics_done', (select done from tc),
    'topics_total', (select total from tc)
  )
$$;

-- ── Ders bazlı ───────────────────────────────────────────────────────────
create or replace function public.analiz_subjects(p_student uuid, p_from date, p_to date)
returns table(
  subject_id uuid, subject_name text, color text, sort_order integer, exam_type text,
  questions integer, correct integer, wrong integer, empty integer, minutes integer,
  video_watched integer, video_total integer, video_minutes integer,
  topics_done integer, topics_total integer, last_date date
)
language sql
stable
security invoker
set search_path = public
as $$
  with subj as (
    select s.subject_id from public.study_sessions s where s.student_id = p_student
    union
    select p.subject_id from public.student_resource_playlists p where p.student_id = p_student
  ),
  ses as (
    select s.subject_id,
           sum(s.total_questions) filter (where (p_from is null or s.date >= p_from) and s.date <= p_to) q,
           sum(s.correct) filter (where (p_from is null or s.date >= p_from) and s.date <= p_to) c,
           sum(s.wrong) filter (where (p_from is null or s.date >= p_from) and s.date <= p_to) w,
           sum(s.empty) filter (where (p_from is null or s.date >= p_from) and s.date <= p_to) e,
           sum(coalesce(s.duration_minutes, 0)) filter (where (p_from is null or s.date >= p_from) and s.date <= p_to) m,
           max(s.date) last_date
      from public.study_sessions s
     where s.student_id = p_student
     group by s.subject_id
  ),
  vid as (
    select p.subject_id,
           count(*) total,
           count(*) filter (where v.watch_status = 'izlendi') watched,
           sum(coalesce(v.duration_seconds, 0)) filter (
             where v.watch_status = 'izlendi' and v.watched_at is not null
               and (p_from is null or (v.watched_at at time zone 'Europe/Istanbul')::date >= p_from)
               and (v.watched_at at time zone 'Europe/Istanbul')::date <= p_to) / 60 vmin,
           max((v.watched_at at time zone 'Europe/Istanbul')::date) last_video
      from public.student_resource_videos v
      join public.student_resource_playlists p on p.id = v.playlist_id
     where v.student_id = p_student
     group by p.subject_id
  ),
  tc as (
    select tp.subject_id, count(*) filter (where z.done) done, count(*) total
      from (
        select t.topic_id, bool_or(t.done) done
          from (
            select st.topic_id, st.status = 'tamam' done
              from public.student_topics st
             where st.student_id = p_student and st.topic_id is not null
            union all
            select ta.topic_id, ta.status = 'tamamlandi'
              from public.topic_assignments ta
             where ta.student_id = p_student and ta.status <> 'iptal'
          ) t
         group by t.topic_id
      ) z
      join public.topics tp on tp.id = z.topic_id
     group by tp.subject_id
  )
  select sb.id, sb.name, sb.color, sb."order", sb.exam_type,
         coalesce(ses.q, 0)::int, coalesce(ses.c, 0)::int, coalesce(ses.w, 0)::int, coalesce(ses.e, 0)::int, coalesce(ses.m, 0)::int,
         coalesce(vid.watched, 0)::int, coalesce(vid.total, 0)::int, coalesce(vid.vmin, 0)::int,
         coalesce(tc.done, 0)::int, coalesce(tc.total, 0)::int,
         nullif(greatest(coalesce(ses.last_date, '-infinity'::date), coalesce(vid.last_video, '-infinity'::date)), '-infinity'::date)
    from subj
    join public.subjects sb on sb.id = subj.subject_id
    left join ses on ses.subject_id = sb.id
    left join vid on vid.subject_id = sb.id
    left join tc on tc.subject_id = sb.id
$$;

-- ── Konu bazlı ───────────────────────────────────────────────────────────
-- p_split: "son dönem" başlangıcı (gelişen konular: öncesi vs sonrası).
create or replace function public.analiz_topics(p_student uuid, p_from date, p_to date, p_subject uuid default null, p_split date default null)
returns table(
  topic_id uuid, topic_name text, subject_id uuid, subject_name text, sort_order integer,
  questions integer, correct integer, q_recent integer, c_recent integer, q_before integer, c_before integer,
  questions_all integer, wrong_book integer, videos_total integer, videos_watched integer,
  next_video_id text, konu_status text, in_target boolean, last_date date
)
language sql
stable
security invoker
set search_path = public
as $$
  with st as (
    select s.topic_id,
           sum(s.total_questions) filter (where (p_from is null or s.date >= p_from) and s.date <= p_to) q,
           sum(s.correct) filter (where (p_from is null or s.date >= p_from) and s.date <= p_to) c,
           sum(s.total_questions) filter (where p_split is not null and s.date >= p_split and s.date <= p_to) q_recent,
           sum(s.correct) filter (where p_split is not null and s.date >= p_split and s.date <= p_to) c_recent,
           sum(s.total_questions) filter (where p_split is not null and (p_from is null or s.date >= p_from) and s.date < p_split) q_before,
           sum(s.correct) filter (where p_split is not null and (p_from is null or s.date >= p_from) and s.date < p_split) c_before,
           sum(s.total_questions) q_all,
           max(s.date) last_date
      from public.study_sessions s
     where s.student_id = p_student and s.topic_id is not null
     group by s.topic_id
  ),
  wa as (
    select w.topic_id, count(*) n
      from public.wrong_answers w
     where w.student_id = p_student
       and (p_from is null or (w.created_at at time zone 'Europe/Istanbul')::date >= p_from)
       and (w.created_at at time zone 'Europe/Istanbul')::date <= p_to
     group by w.topic_id
  ),
  vd as (
    select v.topic_id,
           count(*) total,
           count(*) filter (where v.watch_status = 'izlendi') watched,
           (array_agg(v.youtube_video_id order by (p.status = 'aktif') desc, v.position)
              filter (where v.watch_status <> 'izlendi'))[1] next_video
      from public.student_resource_videos v
      join public.student_resource_playlists p on p.id = v.playlist_id
     where v.student_id = p_student and v.topic_id is not null and v.match_status <> 'eslesmedi'
     group by v.topic_id
  ),
  kn as (
    select st2.topic_id, min(st2.status) status
      from public.student_topics st2
     where st2.student_id = p_student and st2.topic_id is not null
     group by st2.topic_id
  ),
  tg as (
    select ta.topic_id, bool_or(ta.status in ('aktif', 'sirada')) open_goal
      from public.topic_assignments ta
     where ta.student_id = p_student
     group by ta.topic_id
  ),
  cand as (
    select t.id from public.topics t where p_subject is not null and t.subject_id = p_subject and t.is_active
    union select st.topic_id from st where coalesce(st.q, 0) > 0
    union select wa.topic_id from wa
    union select vd.topic_id from vd
    union select tg.topic_id from tg
    union select kn.topic_id from kn
  )
  select t.id, t.name, t.subject_id, sb.name, t."order",
         coalesce(st.q, 0)::int, coalesce(st.c, 0)::int,
         coalesce(st.q_recent, 0)::int, coalesce(st.c_recent, 0)::int,
         coalesce(st.q_before, 0)::int, coalesce(st.c_before, 0)::int,
         coalesce(st.q_all, 0)::int, coalesce(wa.n, 0)::int,
         coalesce(vd.total, 0)::int, coalesce(vd.watched, 0)::int, vd.next_video,
         kn.status,
         coalesce(tg.open_goal, false) or (kn.status is not null and kn.status <> 'tamam'),
         st.last_date
    from cand
    join public.topics t on t.id = cand.id
    join public.subjects sb on sb.id = t.subject_id
    left join st on st.topic_id = t.id
    left join wa on wa.topic_id = t.id
    left join vd on vd.topic_id = t.id
    left join kn on kn.topic_id = t.id
    left join tg on tg.topic_id = t.id
   where p_subject is null or t.subject_id = p_subject
$$;

-- ── Günlük ───────────────────────────────────────────────────────────────
create or replace function public.analiz_daily(p_student uuid, p_from date, p_to date, p_subject uuid default null)
returns table(day date, questions integer, correct integer, minutes integer, videos integer, video_minutes integer)
language sql
stable
security invoker
set search_path = public
as $$
  with s as (
    select s.date d, sum(s.total_questions) q, sum(s.correct) c, sum(coalesce(s.duration_minutes, 0)) m
      from public.study_sessions s
     where s.student_id = p_student and (p_subject is null or s.subject_id = p_subject)
       and s.date >= p_from and s.date <= p_to
     group by s.date
  ),
  v as (
    select (v.watched_at at time zone 'Europe/Istanbul')::date d, count(*) n, sum(coalesce(v.duration_seconds, 0)) / 60 vm
      from public.student_resource_videos v
      join public.student_resource_playlists p on p.id = v.playlist_id
     where v.student_id = p_student and v.watch_status = 'izlendi' and v.watched_at is not null
       and (p_subject is null or p.subject_id = p_subject)
       and (v.watched_at at time zone 'Europe/Istanbul')::date between p_from and p_to
     group by 1
  )
  select coalesce(s.d, v.d), coalesce(s.q, 0)::int, coalesce(s.c, 0)::int, coalesce(s.m, 0)::int,
         coalesce(v.n, 0)::int, coalesce(v.vm, 0)::int
    from s full join v on v.d = s.d
   order by 1
$$;

-- ── Yanlış defteri ───────────────────────────────────────────────────────
-- "Tekrar edilmemiş": kayıttan sonra aynı konuda soru çözülmemiş yanlış.
create or replace function public.analiz_wrong_answers(p_student uuid, p_from date, p_to date, p_subject uuid default null)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with w as (
    select w.id, w.topic_id, w.error_type, w.knowledge_atom_id, w.created_at,
           t.name topic_name, t.subject_id, sb.name subject_name
      from public.wrong_answers w
      join public.topics t on t.id = w.topic_id
      join public.subjects sb on sb.id = t.subject_id
     where w.student_id = p_student
       and (p_subject is null or t.subject_id = p_subject)
       and (p_from is null or (w.created_at at time zone 'Europe/Istanbul')::date >= p_from)
       and (w.created_at at time zone 'Europe/Istanbul')::date <= p_to
  )
  select jsonb_build_object(
    'total', (select count(*) from w),
    'unrepeated', (select count(*) from w
                    where not exists (select 1 from public.study_sessions s
                                       where s.student_id = p_student and s.topic_id = w.topic_id
                                         and s.date > (w.created_at at time zone 'Europe/Istanbul')::date)),
    'by_subject', coalesce((select jsonb_agg(x order by x.n desc) from (
        select subject_id, subject_name name, count(*) n from w group by subject_id, subject_name) x), '[]'::jsonb),
    'by_topic', coalesce((select jsonb_agg(x order by x.n desc) from (
        select topic_id, topic_name name, subject_name, count(*) n from w group by topic_id, topic_name, subject_name
        order by count(*) desc limit 10) x), '[]'::jsonb),
    'by_error_type', coalesce((select jsonb_agg(x order by x.n desc) from (
        select coalesce(error_type, 'belirtilmemis') type, count(*) n from w group by 1) x), '[]'::jsonb),
    'by_atom_type', coalesce((select jsonb_agg(x order by x.n desc) from (
        select ka.type, count(*) n from w join public.knowledge_atoms ka on ka.id = w.knowledge_atom_id group by ka.type) x), '[]'::jsonb),
    'top_atoms', coalesce((select jsonb_agg(x order by x.n desc) from (
        select ka.name, ka.type, count(*) n from w join public.knowledge_atoms ka on ka.id = w.knowledge_atom_id
         group by ka.id, ka.name, ka.type order by count(*) desc limit 8) x), '[]'::jsonb)
  )
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'analiz_overview(uuid, date, date, uuid)',
    'analiz_subjects(uuid, date, date)',
    'analiz_topics(uuid, date, date, uuid, date)',
    'analiz_daily(uuid, date, date, uuid)',
    'analiz_wrong_answers(uuid, date, date, uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
