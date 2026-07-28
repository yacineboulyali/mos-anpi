-- =====================================================================
-- Script de migration de schéma vers un NOUVEAU projet Supabase.
-- Recrée l'état final des tables/index/RLS/policies obtenu en appliquant
-- dans l'ordre les migrations 0001 à 0011 de supabase/migrations/.
--
-- Usage : coller ce script dans Dashboard > SQL Editor du NOUVEAU projet
-- Supabase, puis "Run". Ce script ne migre PAS les données existantes
-- (voir les instructions de migration des données plus bas).
-- =====================================================================

-- gen_random_uuid() dépend de pgcrypto (déjà activé par défaut sur la
-- plupart des projets Supabase, mais on s'assure qu'il l'est).
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- establishments
-- ---------------------------------------------------------------------
create table if not exists public.establishments (
  etablissement text primary key,
  code text not null unique,
  created_at timestamptz not null default now()
);

alter table public.establishments enable row level security;

create policy "anon can read establishments"
  on public.establishments for select
  to anon
  using (true);

create policy "anon can insert establishments"
  on public.establishments for insert
  to anon
  with check (true);

create policy "anon can update establishments"
  on public.establishments for update
  to anon
  using (true)
  with check (true);

create policy "anon can delete establishments"
  on public.establishments for delete
  to anon
  using (true);

-- ---------------------------------------------------------------------
-- students
-- ---------------------------------------------------------------------
create table if not exists public.students (
  cin text primary key,
  nom text not null,
  groupe text,
  etablissement text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.students enable row level security;

create policy "anon can read students"
  on public.students for select
  to anon
  using (true);

create policy "anon can insert students"
  on public.students for insert
  to anon
  with check (true);

create policy "anon can update students"
  on public.students for update
  to anon
  using (true)
  with check (true);

create policy "anon can delete students"
  on public.students for delete
  to anon
  using (true);

-- ---------------------------------------------------------------------
-- exam_settings (clé composite exam_id + etablissement depuis la 0006)
-- ---------------------------------------------------------------------
create table if not exists public.exam_settings (
  exam_id text not null,
  etablissement text not null default 'GLOBAL',
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (exam_id, etablissement)
);

alter table public.exam_settings enable row level security;

create policy "anon can read exam_settings"
  on public.exam_settings for select
  to anon
  using (true);

create policy "anon can insert exam_settings"
  on public.exam_settings for insert
  to anon
  with check (true);

create policy "anon can update exam_settings"
  on public.exam_settings for update
  to anon
  using (true)
  with check (true);

-- ---------------------------------------------------------------------
-- attempts
-- ---------------------------------------------------------------------
create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  nom text not null,
  groupe text,
  etablissement text,
  exam_id text not null,
  exam_label text,
  score numeric not null,
  correct integer not null,
  total integer not null,
  passed boolean not null,
  duration_sec integer not null,
  per_domain jsonb,
  answers jsonb,
  created_at timestamptz not null default now(),
  device text,
  connection_type text,
  cin text,
  kind text not null default 'training' check (kind in ('training', 'official'))
);

create index if not exists attempts_ts_idx on public.attempts (ts desc);
create index if not exists attempts_exam_id_idx on public.attempts (exam_id);
create index if not exists attempts_cin_idx on public.attempts (cin);
create index if not exists attempts_kind_idx on public.attempts (kind);

alter table public.attempts enable row level security;

create policy "anon can insert attempts"
  on public.attempts for insert
  to anon
  with check (true);

create policy "anon can read attempts"
  on public.attempts for select
  to anon
  using (true);

create policy "anon can delete attempts"
  on public.attempts for delete
  to anon
  using (true);

-- ---------------------------------------------------------------------
-- exam_progress
-- ---------------------------------------------------------------------
create table if not exists public.exam_progress (
  cin text not null,
  exam_id text not null,
  nom text,
  groupe text,
  etablissement text,
  device text,
  connection_type text,
  questions jsonb not null,
  answers jsonb not null default '{}'::jsonb,
  current_index integer not null default 0,
  attempt_number integer not null default 1,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (cin, exam_id)
);

alter table public.exam_progress enable row level security;

create policy "anon can insert exam_progress"
  on public.exam_progress for insert
  to anon
  with check (true);

create policy "anon can update exam_progress"
  on public.exam_progress for update
  to anon
  using (true)
  with check (true);

create policy "anon can select exam_progress"
  on public.exam_progress for select
  to anon
  using (true);

create policy "anon can delete exam_progress"
  on public.exam_progress for delete
  to anon
  using (true);
