-- ─────────────────────────────────────────────────────────────────────────
-- 205 — Açık haritası hesapları (SQL'de, client'ta değil)
-- ─────────────────────────────────────────────────────────────────────────
-- Üç fonksiyon, hepsi SECURITY INVOKER → RLS geçerli:
--   öğrenci yalnız kendini, koç kendi öğrencisini, kurum yöneticisi kendi
--   kurumunun öğrencisini, admin herkesi görür; yetkisiz çağrı boş döner.
--
-- ZAYIFLIK SKORU (student_gap_map) — Bayesian smoothing (Beta-Binom ortalaması):
--
--   w   = öğrencinin o ATOMA yazılmış yanlış sayısı (wrong_answers)
--   n   = öğrencinin o atomun KONUSUNDA çözdüğü toplam soru (study_sessions)
--         → normalize paydası: "bu konuda kaç soru gördün?"
--   p_s = öğrencinin o DERSTEKİ genel yanlış oranı = Σwrong / Σtotal
--         (o derste hiç soru kaydı yoksa varsayılan 0.25; yalnız bu durumda
--          devreye girer — o zaman n=0 olduğundan güven zaten "yetersiz")
--   K   = konudaki atom sayısı
--   p0  = p_s / K   ← ÖNCÜL: dersteki genel yanlışın konudaki atomlara eşit
--                     payı. "Bu atom ortalama bir atom kadar sorunlu" varsayımı.
--   m   = 10        ← öncül gücü (sahte soru sayısı). Az veride skoru öncüle
--                     çeker; n büyüdükçe veri baskın olur.
--
--   score = (w + m·p0) / (n + m)
--
--   Örnek: p_s=0.30, K=6 → p0=0.05. 3 soruda 2 atom-yanlışı: (2+0.5)/(3+10)=0.19
--   (ham oran 0.67 yerine — az veriye aşırı tepki yok). 120 soruda 24 yanlış:
--   (24+0.5)/(130)=0.19 ama güven "orta". Sıralama skor; güven ayrı gösterilir.
--
--   GÜVEN (konuda çözülen soru n'e göre):
--     n < 20 → 'yetersiz' (yetersiz veri) · 20–49 → 'dusuk' · 50–149 → 'orta' · ≥150 → 'yuksek'
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.student_gap_map(p_student_id uuid, p_since date default null)
returns table (
  atom_id uuid,
  atom_name text,
  atom_type text,
  atom_sort integer,
  topic_id uuid,
  topic_name text,
  subject_id uuid,
  subject_name text,
  wrong_count integer,
  topic_questions integer,
  subject_wrong_rate numeric,
  atoms_in_topic integer,
  score numeric,
  confidence text,
  prerequisite_ids uuid[]
)
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select 10::numeric as m,          -- öncül gücü (sahte soru)
           0.25::numeric as p_default -- ders verisi yoksa öncül yanlış oranı
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
     where w.student_id = p_student_id
       and (p_since is null
            or coalesce(s.date, (w.created_at at time zone 'Europe/Istanbul')::date) >= p_since)
     group by w.knowledge_atom_id, w.topic_id
  ),
  active_topics as (
    -- Öğrencinin ya soru çözdüğü ya da yanlış girdiği konular.
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

-- Hata tipi dağılımı: ders × konu × hata tipi (bilgi eksikliği ≠ işlem hatası).
create or replace function public.student_error_distribution(p_student_id uuid, p_since date default null)
returns table (
  subject_id uuid,
  subject_name text,
  topic_id uuid,
  topic_name text,
  error_type text,
  cnt integer
)
language sql
stable
security invoker
set search_path = public
as $$
  select sb.id, sb.name, t.id, t.name, w.error_type, count(*)::int
    from public.wrong_answers w
    left join public.study_sessions s on s.id = w.study_session_id
    join public.topics t on t.id = w.topic_id
    join public.subjects sb on sb.id = t.subject_id
   where w.student_id = p_student_id
     and (p_since is null
          or coalesce(s.date, (w.created_at at time zone 'Europe/Istanbul')::date) >= p_since)
   group by sb.id, sb.name, t.id, t.name, w.error_type
$$;

-- Haftalık trend: Istanbul haftası (Pazartesi) × hata tipi, son p_weeks hafta.
-- Tarih: yanlışın bağlı olduğu soru kaydının tarihi, yoksa kayıt anı (Istanbul).
create or replace function public.student_gap_trend(p_student_id uuid, p_weeks integer default 4)
returns table (
  week_start date,
  error_type text,
  cnt integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with bounds as (
    select (date_trunc('week', (now() at time zone 'Europe/Istanbul'))::date
            - (greatest(p_weeks, 1) - 1) * 7) as first_week
  ),
  dated as (
    select w.error_type,
           coalesce(s.date, (w.created_at at time zone 'Europe/Istanbul')::date) as d
      from public.wrong_answers w
      left join public.study_sessions s on s.id = w.study_session_id
     where w.student_id = p_student_id
  )
  select date_trunc('week', d)::date, error_type, count(*)::int
    from dated, bounds
   where d >= bounds.first_week
   group by 1, 2
$$;

revoke all on function public.student_gap_map(uuid, date) from public, anon;
revoke all on function public.student_error_distribution(uuid, date) from public, anon;
revoke all on function public.student_gap_trend(uuid, integer) from public, anon;
grant execute on function public.student_gap_map(uuid, date) to authenticated;
grant execute on function public.student_error_distribution(uuid, date) to authenticated;
grant execute on function public.student_gap_trend(uuid, integer) to authenticated;
