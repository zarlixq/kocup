-- ─────────────────────────────────────────────────────────────────────────
-- 203 — Yanlış defteri (wrong_answers)
-- ─────────────────────────────────────────────────────────────────────────
-- MODEL: her yanlış soru = bir satır. Ayrı "hata dağılımı" tablosu YOK:
--   * Kademe 1 (hata tipi sayaçları) → N satır, knowledge_atom_id boş
--   * Kademe 2 (bilmiyordum → atom)  → aynı satırlara atom yazılır
--   Dağılım, açık haritası ve trend hepsi count(*) ile bu tek tablodan çıkar;
--   iki tablo arasında senkron problemi olmaz. Hacim ≤ çözülen yanlış sayısı.
--
-- Soru çözüm kaydı silinirse yanlışlar da silinir (CASCADE, kullanıcı kararı):
-- açık haritası "çözülen soruya göre normalize" olduğundan, sorusu silinmiş
-- yanlışın kalması oranları şişirirdi.
--
-- RLS: öğrenci kendi satırlarını yönetir; koç (is_coach_of), admin ve kurum
-- yöneticisi (öğrencinin kurumu) yalnızca OKUR.
-- photo_path: sonraki faz (fotoğraflı analiz) için; şimdilik kullanılmıyor.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.wrong_answers (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.profiles(id) on delete cascade,
  study_session_id  uuid references public.study_sessions(id) on delete cascade,
  topic_id          uuid not null references public.topics(id) on delete cascade,
  knowledge_atom_id uuid references public.knowledge_atoms(id) on delete set null,
  error_type        text not null,
  note              text,
  photo_path        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint wrong_answers_error_type_check check (
    error_type in ('bilgi_eksik', 'islem_hatasi', 'dikkat_okuma', 'sure_yetmedi', 'hic_fikrim_yok')
  ),
  constraint wrong_answers_note_len_check check (note is null or length(note) <= 1000)
);

create index if not exists wrong_answers_student_topic_idx on public.wrong_answers (student_id, topic_id);
create index if not exists wrong_answers_session_idx on public.wrong_answers (study_session_id);
create index if not exists wrong_answers_atom_idx on public.wrong_answers (knowledge_atom_id);

drop trigger if exists trg_wrong_answers_updated_at on public.wrong_answers;
create trigger trg_wrong_answers_updated_at
  before update on public.wrong_answers
  for each row execute function public.set_updated_at();

-- ── Tutarlılık: oturum ↔ öğrenci/konu, atom ↔ konu, sayı ≤ yanlış ─────────
-- SECURITY INVOKER: oturumu çağıranın RLS'iyle okur → başka öğrencinin
-- oturumuna bağlamaya çalışan "bulunamadı" alır.
create or replace function public.wrong_answers_consistency()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_sess record;
  v_count integer;
  v_atom_topic uuid;
begin
  if new.study_session_id is not null then
    select student_id, topic_id, wrong into v_sess
      from public.study_sessions where id = new.study_session_id;
    if not found then
      raise exception 'Soru kaydı bulunamadı.' using errcode = '23503';
    end if;
    new.student_id := v_sess.student_id;
    -- Oturumun konusu varsa o geçerli; konusuz eski kayıtta gelen konu kalır.
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

  if new.knowledge_atom_id is not null then
    select topic_id into v_atom_topic from public.knowledge_atoms where id = new.knowledge_atom_id;
    if v_atom_topic is distinct from new.topic_id then
      raise exception 'Seçilen bilgi atomu bu konuya ait değil.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_wrong_answers_consistency on public.wrong_answers;
create trigger trg_wrong_answers_consistency
  before insert or update on public.wrong_answers
  for each row execute function public.wrong_answers_consistency();

-- ── Soru kaydının yanlış sayısı, kayıtlı yanlışların altına inemez ───────
-- SECURITY DEFINER: koç da oturumu güncelleyebildiği için sayım RLS'ten
-- bağımsız olmalı. Yalnızca sayar, veri döndürmez.
create or replace function public.study_sessions_wrong_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.wrong_answers where study_session_id = new.id;
  if v_count > new.wrong then
    raise exception 'Bu kayıtta % yanlış defteri kaydı var; yanlış sayısını bunun altına indirmeden önce yanlış defterinden sil.', v_count
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.study_sessions_wrong_guard() from public, anon, authenticated;

drop trigger if exists trg_study_sessions_wrong_guard on public.study_sessions;
create trigger trg_study_sessions_wrong_guard
  before update of wrong on public.study_sessions
  for each row
  when (new.wrong < old.wrong)
  execute function public.study_sessions_wrong_guard();

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table public.wrong_answers enable row level security;

drop policy if exists "wrong_answers_select" on public.wrong_answers;
create policy "wrong_answers_select" on public.wrong_answers
  for select using (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
    or exists (
      select 1 from public.profiles p
      where p.id = wrong_answers.student_id
        and p.organization_id is not null
        and public.is_org_admin_of(p.organization_id)
    )
  );

drop policy if exists "wrong_answers_insert" on public.wrong_answers;
create policy "wrong_answers_insert" on public.wrong_answers
  for insert with check (student_id = auth.uid());

drop policy if exists "wrong_answers_update" on public.wrong_answers;
create policy "wrong_answers_update" on public.wrong_answers
  for update using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists "wrong_answers_delete" on public.wrong_answers;
create policy "wrong_answers_delete" on public.wrong_answers
  for delete using (student_id = auth.uid());

-- ── RPC: bir soru kaydının yanlışlarını hedef duruma uzlaştır ─────────────
-- p_items: [{ "error_type": "...", "knowledge_atom_id": uuid|null, "count": int }]
-- (tip, atom) grubu başına: mevcut satırlar KORUNUR (önce notlu olanlar),
-- fazlası silinir, eksiği eklenir → tekrar kaydetmek notları kaybetmez.
-- p_topic_id yalnızca konusuz eski kayıtlarda kullanılır.
-- SECURITY INVOKER: tüm yazmalar öğrencinin RLS'iyle yapılır.
create or replace function public.set_session_wrong_answers(
  p_session_id uuid,
  p_items jsonb,
  p_topic_id uuid default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_sess record;
  v_topic uuid;
  v_total integer;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Geçersiz yanlış listesi.';
  end if;

  select id, student_id, topic_id, wrong into v_sess
    from public.study_sessions where id = p_session_id;
  if not found or v_sess.student_id is distinct from auth.uid() then
    raise exception 'Soru kaydı bulunamadı.';
  end if;

  v_topic := coalesce(v_sess.topic_id, p_topic_id);
  if v_topic is null then
    raise exception 'Bu soru kaydında konu yok; önce konu seç.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) x
    where coalesce((x->>'count')::int, -1) < 0
       or x->>'error_type' not in ('bilgi_eksik', 'islem_hatasi', 'dikkat_okuma', 'sure_yetmedi', 'hic_fikrim_yok')
  ) then
    raise exception 'Geçersiz hata tipi ya da sayı.';
  end if;

  select coalesce(sum((x->>'count')::int), 0) into v_total from jsonb_array_elements(p_items) x;
  if v_total > v_sess.wrong then
    raise exception 'Bu soru kaydında en fazla % yanlış girilebilir.', v_sess.wrong;
  end if;

  -- 1) Fazla satırları sil (önce yeni eklenen, notsuz olanlar gider).
  with desired as (
    select x->>'error_type' as et,
           nullif(x->>'knowledge_atom_id', '')::uuid as atom,
           sum((x->>'count')::int) as cnt
      from jsonb_array_elements(p_items) x
     group by 1, 2
  ),
  ranked as (
    select w.id, w.error_type, w.knowledge_atom_id,
           row_number() over (
             partition by w.error_type, w.knowledge_atom_id
             order by (w.note is null), w.created_at
           ) as rn
      from public.wrong_answers w
     where w.study_session_id = p_session_id
  )
  delete from public.wrong_answers w
   using ranked r
   left join desired d
     on d.et = r.error_type and d.atom is not distinct from r.knowledge_atom_id
   where w.id = r.id
     and r.rn > coalesce(d.cnt, 0);

  -- 2) Eksikleri ekle.
  with desired as (
    select x->>'error_type' as et,
           nullif(x->>'knowledge_atom_id', '')::uuid as atom,
           sum((x->>'count')::int) as cnt
      from jsonb_array_elements(p_items) x
     group by 1, 2
  ),
  missing as (
    select d.et, d.atom,
           d.cnt - (
             select count(*) from public.wrong_answers w
              where w.study_session_id = p_session_id
                and w.error_type = d.et
                and w.knowledge_atom_id is not distinct from d.atom
           ) as n
      from desired d
  )
  insert into public.wrong_answers (student_id, study_session_id, topic_id, knowledge_atom_id, error_type)
  select auth.uid(), p_session_id, v_topic, m.atom, m.et
    from missing m
    cross join lateral generate_series(1, greatest(m.n, 0));
end;
$$;

revoke all on function public.set_session_wrong_answers(uuid, jsonb, uuid) from public, anon;
grant execute on function public.set_session_wrong_answers(uuid, jsonb, uuid) to authenticated;
