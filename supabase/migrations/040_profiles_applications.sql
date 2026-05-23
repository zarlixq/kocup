-- ─────────────────────────────────────────────────────────────────────────
-- PROFILES — tüm portal kullanıcıları (öğrenci / koç / admin)
-- ─────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  role       text        not null check (role in ('student', 'coach', 'admin')),
  full_name  text        not null,
  email      text        not null,
  phone      text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- APPLICATIONS — başvuru formu kayıtları (public INSERT)
-- ─────────────────────────────────────────────────────────────────────────
create table public.applications (
  id                  uuid        primary key default gen_random_uuid(),
  full_name           text        not null,
  email               text        not null,
  phone               text        not null,
  grade               text        not null check (grade in ('9', '10', '11', '12', 'Mezun')),
  target_university   text,
  target_department   text,
  target_ranking      integer     check (target_ranking is null or target_ranking > 0),
  parent_name         text        not null,
  parent_phone        text        not null,
  status              text        not null default 'pending'
                                  check (status in ('pending', 'approved', 'rejected')),
  rejection_reason    text,
  approved_student_id uuid        references auth.users(id),
  reviewed_by         uuid        references auth.users(id),
  reviewed_at         timestamptz,
  created_at          timestamptz default now()
);

alter table public.applications enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- STUDENTS — portal öğrencileri (muhasebe "clients"'tan FARKLI)
-- ─────────────────────────────────────────────────────────────────────────
create table public.students (
  id                uuid        primary key references public.profiles(id) on delete cascade,
  coach_id          uuid        references public.profiles(id),
  grade             text,
  target_university text,
  target_department text,
  target_ranking    integer,
  parent_name       text,
  parent_phone      text,
  created_at        timestamptz default now()
);

alter table public.students enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- HELPER FUNCTIONS (tablolar oluştuktan sonra tanımlanıyor)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.current_user_role()
returns text language sql security definer stable
set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_coach_of(student_id uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.students
    where id = student_id and coach_id = auth.uid()
  )
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- RLS: PROFILES
-- ─────────────────────────────────────────────────────────────────────────
-- Herkes kendi satırını okur
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Koç kendi öğrencilerinin profilini okur
create policy "profiles_select_coach_students" on public.profiles
  for select using (
    exists (
      select 1 from public.students s
      where s.id = id and s.coach_id = auth.uid()
    )
  );

-- Admin her şeyi yönetir
create policy "profiles_admin_all" on public.profiles
  for all using (public.current_user_role() = 'admin');

-- Kullanıcı kendi profilini günceller (role değiştiremez — uygulama katmanında korunur)
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────
-- RLS: APPLICATIONS
-- ─────────────────────────────────────────────────────────────────────────
-- Herkes (anonim dahil) başvurabilir
create policy "applications_insert_public" on public.applications
  for insert with check (true);

-- Admin tüm başvuruları yönetir
create policy "applications_admin_all" on public.applications
  for all using (public.current_user_role() = 'admin');

-- ─────────────────────────────────────────────────────────────────────────
-- RLS: STUDENTS
-- ─────────────────────────────────────────────────────────────────────────
-- Öğrenci kendi kaydını okur
create policy "students_select_own" on public.students
  for select using (auth.uid() = id);

-- Koç kendi öğrencilerini görür ve günceller
create policy "students_select_coach" on public.students
  for select using (public.is_coach_of(id));

create policy "students_update_coach" on public.students
  for update using (public.is_coach_of(id));

-- Admin tüm öğrencileri yönetir
create policy "students_admin_all" on public.students
  for all using (public.current_user_role() = 'admin');

-- ─────────────────────────────────────────────────────────────────────────
-- TRIGGER: handle_new_coach (GÜNCELLENDİ)
-- role metadata YOKSA → muhasebe coaches INSERT (eski davranış korunuyor)
-- role metadata VARSA → portal kullanıcısı, muhasebe coaches'a ekleme
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_coach()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if new.raw_user_meta_data->>'role' is null then
    insert into public.coaches (id, full_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  end if;
  return new;
end; $$;

-- ─────────────────────────────────────────────────────────────────────────
-- TRIGGER: handle_new_user (YENİ)
-- role metadata VARSA → profiles INSERT (portal kullanıcısı daveti)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if new.raw_user_meta_data->>'role' is not null then
    insert into public.profiles (id, role, full_name, email, phone)
    values (
      new.id,
      new.raw_user_meta_data->>'role',
      coalesce(
        new.raw_user_meta_data->>'full_name',
        split_part(new.email, '@', 1)
      ),
      new.email,
      new.raw_user_meta_data->>'phone'
    );
  end if;
  return new;
end; $$;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────
create index on public.profiles (role);
create index on public.students (coach_id);
create index on public.applications (status);
create index on public.applications (email);
