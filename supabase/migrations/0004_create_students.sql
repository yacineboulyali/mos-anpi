-- Table des stagiaires, identifiés par leur CIN (carte d'identité nationale).
-- Permet de reconnaître un stagiaire d'une session à l'autre, sur n'importe
-- quel poste : il saisit son CIN et ses informations (nom, groupe,
-- établissement) s'affichent automatiquement.
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
