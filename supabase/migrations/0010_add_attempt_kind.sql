-- Distingue les tentatives d'entraînement (illimité, feedback immédiat) des
-- tentatives d'examen officiel (5 max, sans feedback), dans la même table.
alter table public.attempts
  add column if not exists kind text not null default 'training'
  check (kind in ('training', 'official'));

create index if not exists attempts_kind_idx on public.attempts (kind);
