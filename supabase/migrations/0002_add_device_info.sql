-- Ajoute les informations d'appareil et de connexion réseau du candidat
-- (à titre statistique uniquement, aucune donnée précise/identifiante).
alter table public.attempts
  add column if not exists device text,
  add column if not exists connection_type text;
