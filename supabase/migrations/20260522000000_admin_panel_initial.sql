create table public.coaches (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  created_at timestamptz default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  full_name text not null,
  phone text,
  parent_name text,
  parent_phone text,
  school text,
  grade text,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  name text not null,
  monthly_price numeric(10,2) not null,
  start_date date not null,
  end_date date,
  payment_day int default 1 check (payment_day between 1 and 31),
  status text default 'active' check (status in ('active','paused','ended')),
  notes text,
  created_at timestamptz default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  amount numeric(10,2) not null,
  payment_date date not null,
  period_month date not null,
  method text,
  notes text,
  created_at timestamptz default now()
);

alter table public.coaches enable row level security;
alter table public.students enable row level security;
alter table public.packages enable row level security;
alter table public.payments enable row level security;

create policy "coaches_select_own" on public.coaches for select using (auth.uid() = id);
create policy "coaches_update_own" on public.coaches for update using (auth.uid() = id);

create policy "students_all_own" on public.students for all
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy "packages_all_own" on public.packages for all
  using (exists (select 1 from public.students s where s.id = packages.student_id and s.coach_id = auth.uid()))
  with check (exists (select 1 from public.students s where s.id = packages.student_id and s.coach_id = auth.uid()));

create policy "payments_all_own" on public.payments for all
  using (exists (select 1 from public.students s where s.id = payments.student_id and s.coach_id = auth.uid()))
  with check (exists (select 1 from public.students s where s.id = payments.student_id and s.coach_id = auth.uid()));

create or replace function public.handle_new_coach()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.coaches (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_coach();

create index on public.students (coach_id);
create index on public.packages (student_id);
create index on public.payments (student_id, period_month);
