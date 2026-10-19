-- ─────────────────────────────────────────────────────────────────────────
-- 207 — UpPlan: katsayı tablosu, öğrenci profili, konu taraması
-- ─────────────────────────────────────────────────────────────────────────
-- upplan_config: SQL tarafının ihtiyaç duyduğu katsayılar. Kaynak
-- lib/upplan/config.ts (UPPLAN_SQL_CONFIG); lib/upplan/config.test.ts bu
-- dosyadaki seed satırlarını config.ts ile karşılaştırır → ikisi senkron.
-- Değiştirirken: config.ts + yeni migration (update upplan_config ...).
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1) Katsayılar ────────────────────────────────────────────────────────
create table if not exists public.upplan_config (
  key text primary key,
  value numeric not null,
  note text
);

alter table public.upplan_config enable row level security;

drop policy if exists upplan_config_select on public.upplan_config;
create policy upplan_config_select on public.upplan_config
  for select to authenticated using (true);
-- Yazma politikası yok: yalnız migration.

insert into public.upplan_config (key, value, note) values
  ('prior_hic_gormedim', 10, 'Tarama: hiç görmedim öncülü (0-100)'),
  ('prior_eksik', 45, 'Tarama: eksik öncülü (0-100)'),
  ('prior_biliyorum', 75, 'Tarama: biliyorum öncülü (0-100)'),
  ('prior_weight', 20, 'Taramalı öncülün soru eşdeğeri ağırlığı'),
  ('prior_none', 40, 'Tarama yoksa öncül (0-100)'),
  ('prior_none_weight', 5, 'Tarama yoksa öncül ağırlığı'),
  ('evidence_half_life_days', 21, 'Soru/deneme kanıtının yarı ömrü (gün)'),
  ('exam_wrong_weight', 2, 'Deneme yanlışı kaç soru yanlışı sayılır'),
  ('penalty_full', 1, 'bilgi_eksik / hic_fikrim_yok / belirtilmemiş ceza oranı'),
  ('penalty_half', 0.5, 'islem_hatasi / dikkat_okuma / sure_yetmedi ceza oranı'),
  ('empty_penalty', 1, 'Boş bırakılan soru ceza oranı'),
  ('forget_half_life_days', 45, 'Unutma yarı ömrü (gün)'),
  ('forget_floor_ratio', 0.6, 'Unutma tabanı: saklanan skorun oranı'),
  ('confidence_orta', 20, 'Ağırlıklı kanıt ≥ bu → orta güven'),
  ('confidence_yuksek', 60, 'Ağırlıklı kanıt ≥ bu → yüksek güven'),
  ('label_gelisiyor', 40, 'Etkili skor ≥ bu → gelişiyor'),
  ('label_iyi', 75, 'Etkili skor ≥ bu → iyi'),
  ('forgetting_flag_ratio', 0.85, 'effective < stored × bu → unutulmaya başlıyor'),
  ('overconfident_threshold', 60, 'biliyorum dediği konuda deneme sonrası bu altı → uyarı')
on conflict (key) do update set value = excluded.value, note = excluded.note;

-- ── 2) Öğrenci UpPlan profili ────────────────────────────────────────────
create table if not exists public.student_upplan_profile (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null check (status in ('lise', 'mezun', 'acik_lise')),
  grade smallint check (grade is null or grade between 5 and 12),
  segment text not null check (segment in ('yks', 'lgs')),
  alan text check (alan is null or alan in ('sayisal', 'ea', 'sozel', 'dil')),
  -- {"1":[slot,...], ..., "7":[...]} — gün (1=Pzt) → 30 dk slot indeksleri
  availability jsonb not null default '{}'::jsonb,
  focus_minutes smallint not null default 45 check (focus_minutes in (25, 45, 60, 90)),
  target_department text check (target_department is null or length(target_department) <= 200),
  target_ranking integer check (target_ranking is null or target_ranking > 0),
  setup_step text not null default 'profil' check (setup_step in ('profil', 'tarama', 'deneme', 'bitti')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_upplan_profile_alan_required check (segment = 'lgs' or alan is not null),
  constraint student_upplan_profile_availability_check check (jsonb_typeof(availability) = 'object')
);

drop trigger if exists trg_student_upplan_profile_updated_at on public.student_upplan_profile;
create trigger trg_student_upplan_profile_updated_at
  before update on public.student_upplan_profile
  for each row execute function public.set_updated_at();

alter table public.student_upplan_profile enable row level security;

drop policy if exists student_upplan_profile_own on public.student_upplan_profile;
create policy student_upplan_profile_own on public.student_upplan_profile
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists student_upplan_profile_read on public.student_upplan_profile;
create policy student_upplan_profile_read on public.student_upplan_profile
  for select using (
    public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
    or exists (
      select 1 from public.profiles p
       where p.id = student_upplan_profile.student_id
         and p.organization_id is not null
         and public.is_org_admin_of(p.organization_id)
    )
  );

-- ── 3) Konu taraması (öz-değerlendirme) ──────────────────────────────────
create table if not exists public.student_topic_self_assessment (
  student_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  status text not null check (status in ('hic_gormedim', 'eksik', 'biliyorum')),
  updated_at timestamptz not null default now(),
  primary key (student_id, topic_id)
);

drop trigger if exists trg_student_topic_self_assessment_updated_at on public.student_topic_self_assessment;
create trigger trg_student_topic_self_assessment_updated_at
  before update on public.student_topic_self_assessment
  for each row execute function public.set_updated_at();

alter table public.student_topic_self_assessment enable row level security;

drop policy if exists student_topic_self_assessment_own on public.student_topic_self_assessment;
create policy student_topic_self_assessment_own on public.student_topic_self_assessment
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists student_topic_self_assessment_read on public.student_topic_self_assessment;
create policy student_topic_self_assessment_read on public.student_topic_self_assessment
  for select using (
    public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
    or exists (
      select 1 from public.profiles p
       where p.id = student_topic_self_assessment.student_id
         and p.organization_id is not null
         and public.is_org_admin_of(p.organization_id)
    )
  );
