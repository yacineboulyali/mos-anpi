-- Table des tentatives QCM (candidats, scores, durée, détail par domaine)
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
  created_at timestamptz not null default now()
);

create index if not exists attempts_ts_idx on public.attempts (ts desc);
create index if not exists attempts_exam_id_idx on public.attempts (exam_id);

alter table public.attempts enable row level security;

-- Les candidats (clé publique anon) peuvent enregistrer leur tentative.
create policy "anon can insert attempts"
  on public.attempts for insert
  to anon
  with check (true);

-- Le tableau de bord formateur (même clé publique, protégée par un code
-- d'accès côté interface uniquement) lit les tentatives pour les statistiques.
create policy "anon can read attempts"
  on public.attempts for select
  to anon
  using (true);
