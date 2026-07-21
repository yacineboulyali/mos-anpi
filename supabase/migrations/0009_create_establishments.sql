-- Table des établissements gérés dynamiquement depuis l'espace Super
-- Administration (code ADMIN2026) : nom + code d'accès formateur/directeur.
-- S'ajoute à la liste statique historique (voir src/lib/establishmentsAdmin.js)
-- sans la remplacer.
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
