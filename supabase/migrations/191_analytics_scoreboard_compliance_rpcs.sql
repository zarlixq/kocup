-- ─────────────────────────────────────────────────────────────────────────
-- 191 — Analitik RPC'leri: haftalık program uyumu + öğrenci skor istatistikleri
-- ─────────────────────────────────────────────────────────────────────────
-- Her iki fonksiyon da SECURITY INVOKER → çağıranın RLS kapsamına saygılıdır:
--   * müdür (admin)  → tüm platform (students_admin_all, topic_assignments_admin_all)
--   * koç            → yalnız kendi öğrencileri (topic_assignments coach_id = auth.uid(),
--                       study_sessions is_coach_of)
-- Böylece aynı fonksiyon müdür ve koç panellerince paylaşılır (kopyalama yok).
--
-- Uyum primitifi: weekly_programs (student_id + week_start) ve weekly_program_items
-- (program_id + is_completed). Koç öğrenciye o haftaya ait program maddeleri atar,
-- öğrenci/koç maddeleri tamamlandı işaretler. Uyum = tamamlanan madde / toplam madde.
-- (topic_assignments değil — bu tablo gerçek "haftalık program tamamlama" primitifidir.)
--
-- ROLLBACK:
--   drop function if exists public.weekly_program_compliance(date, uuid);
--   drop function if exists public.student_scoreboard_stats(date);
-- ─────────────────────────────────────────────────────────────────────────

-- ── Haftalık program uyumu ──────────────────────────────────────────────
-- Verilen hafta için (p_week_start = weekly_programs.week_start, Pazartesi) öğrenci
-- başına toplam ve tamamlanmış madde sayısını döndürür. Yüzde formülü TS tarafında
-- (lib/analytics/compliance.ts) tek yerde: total_items>0 ? done/total : null.
-- p_student_id verilirse tek öğrenciye süzer (detay sayfası için).
create or replace function public.weekly_program_compliance(
  p_week_start date,
  p_student_id uuid default null
)
returns table (
  student_id  uuid,
  total_items integer,
  done_items  integer
)
language sql
security invoker
stable
set search_path = public
as $$
  select
    wp.student_id,
    count(wpi.id)::int                                        as total_items,
    count(wpi.id) filter (where wpi.is_completed)::int        as done_items
  from public.weekly_programs wp
  left join public.weekly_program_items wpi on wpi.program_id = wp.id
  where wp.week_start = p_week_start
    and (p_student_id is null or wp.student_id = p_student_id)
  group by wp.student_id
$$;

-- ── Öğrenci skor istatistikleri (müdür leaderboard) ─────────────────────
-- p_since tarihinden bugüne: çözülen soru, doğru, aktif gün sayısı + son deneme net.
-- active_days aktiflik-çarpanı için kullanılır (lib/analytics/scoreboard.ts).
create or replace function public.student_scoreboard_stats(
  p_since date
)
returns table (
  student_id    uuid,
  questions     bigint,
  correct       bigint,
  active_days   integer,
  last_exam_net numeric
)
language sql
security invoker
stable
set search_path = public
as $$
  select
    s.id                                as student_id,
    coalesce(ss.questions, 0)::bigint   as questions,
    coalesce(ss.correct, 0)::bigint     as correct,
    coalesce(ss.active_days, 0)::int    as active_days,
    le.net                              as last_exam_net
  from public.students s
  left join lateral (
    select
      sum(x.total_questions)    as questions,
      sum(x.correct)            as correct,
      count(distinct x.date)    as active_days
    from public.study_sessions x
    where x.student_id = s.id
      and x.date >= p_since
  ) ss on true
  left join lateral (
    select coalesce(sum(er.net), 0)::numeric as net
    from public.exam_results er
    where er.exam_id = (
      select e.id from public.exams e
      where e.student_id = s.id
      order by e.date desc
      limit 1
    )
  ) le on true
$$;
