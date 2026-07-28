-- Progression d'un examen officiel en cours. Permet à un candidat qui quitte
-- l'épreuve avant de soumettre (fermeture d'onglet, coupure réseau, etc.) de
-- reprendre exactement là où il s'était arrêté : mêmes questions (déjà
-- tirées au sort), mêmes réponses déjà données. Une seule ligne par
-- (cin, exam_id) : reprendre une épreuve met simplement à jour cette ligne ;
-- elle est supprimée dès que l'épreuve est soumise (voir clearExamProgress).
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
