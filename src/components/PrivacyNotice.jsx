import { supabase } from "../lib/storage";

export default function PrivacyNotice() {
  return (
    <p className="privacy-notice">
      🔒 <strong>Confidentialité (loi 09-08 — CNDP)</strong> :
      {supabase ? (
        <>
          {" "}le nom, le groupe, l'établissement et le score saisis sont enregistrés
          de façon sécurisée dans la base de données du centre de formation
          (hébergée par Supabase, chiffrée en transit), uniquement à des fins de
          suivi pédagogique interne. Ces données ne sont partagées avec aucun
          tiers ni utilisées à des fins commerciales, et peuvent être supprimées
          à tout moment depuis l'espace Administration.
        </>
      ) : (
        <>
          {" "}cette application ne transmet aucune donnée à un serveur. Le nom, le
          groupe et l'établissement saisis restent stockés uniquement dans le
          navigateur de ce poste (localStorage), ne sont partagés avec aucun
          tiers, et peuvent être supprimés à tout moment depuis l'espace
          Administration.
        </>
      )}
    </p>
  );
}
