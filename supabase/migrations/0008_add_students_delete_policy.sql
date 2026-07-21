-- Politique manquante : sans elle, la suppression de stagiaires depuis le
-- tableau de bord (case à cocher + « Supprimer ») échouerait silencieusement
-- (RLS bloquant la suppression sans renvoyer d'erreur : 0 ligne supprimée),
-- comme ce fut le cas pour "attempts" avant la migration 0007.
create policy "anon can delete students"
  on public.students for delete
  to anon
  using (true);
