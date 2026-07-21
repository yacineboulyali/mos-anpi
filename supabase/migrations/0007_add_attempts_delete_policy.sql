-- Politique manquante : sans elle, « Tout effacer » dans le tableau de bord
-- échouait silencieusement (RLS bloquait la suppression sans renvoyer
-- d'erreur : 0 ligne supprimée).
create policy "anon can delete attempts"
  on public.attempts for delete
  to anon
  using (true);
