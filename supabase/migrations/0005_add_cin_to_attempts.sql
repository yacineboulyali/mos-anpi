-- Rattache chaque tentative au CIN du stagiaire qui l'a passée, pour
-- pouvoir reconstituer l'historique complet d'un stagiaire et les
-- statistiques d'engagement par groupe.
alter table public.attempts add column if not exists cin text;
create index if not exists attempts_cin_idx on public.attempts (cin);
