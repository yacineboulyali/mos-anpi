-- Permet au formateur d'activer/désactiver chaque épreuve depuis le
-- tableau de bord (les épreuves désactivées disparaissent du choix sur la
-- page de connexion des candidats).
create table if not exists public.exam_settings (
  exam_id text primary key,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
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
