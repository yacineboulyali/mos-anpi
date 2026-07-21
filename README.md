# QCM MOS — Site d'entraînement

Site React (Vite) pour l'entraînement des stagiaires aux QCM de certification
MOS (60 minutes, seuil 70 %). Quatre épreuves disponibles, sélectionnables sur
la page de connexion :
- **Spécialiste en Microsoft Excel 2016** — 55 questions, 7 domaines
- **Spécialiste en Microsoft Word 2016** — 54 questions, 6 domaines
- **Spécialiste en Microsoft PowerPoint 2016** — 55 questions, 6 domaines
- **Spécialiste Expert en Microsoft Excel 2016** — 43 questions, 5 domaines

## Pages
- `/` — Connexion : le stagiaire choisit d'abord son **établissement**. Pour
  l'INSTITUT SPECIALISE DE TECHNOLOGIE APPLIQUEE AIN ATIQ, un champ **CIN**
  apparaît (reconnaissance automatique — voir plus bas) ; pour les autres
  établissements ou « Autres », un simple champ **nom** suffit.
- `/exam` — Épreuve avec barre d'examen, minuteur et navigation
- `/results` — Score, détail par domaine, correction
- `/admin` — Tableau de bord formateur/directeur, scopé par établissement via
  le code d'accès saisi (voir « Établissements & accès formateur »
  ci-dessous) ; active/désactive chaque épreuve, affiche les statistiques par
  stagiaire, l'engagement par groupe, et des graphes

## Lancer en local
```
npm install
npm run dev
```

## Déployer sur Netlify
1. Créez un compte sur https://app.netlify.com
2. Méthode simple (glisser-déposer) :
   - `npm install && npm run build`
   - Glissez le dossier `dist/` sur https://app.netlify.com/drop
3. Méthode Git : poussez ce dossier sur GitHub puis « Import from Git » sur Netlify —
   le fichier `netlify.toml` configure tout automatiquement.
4. (Optionnel) Dans Site settings → Environment variables, ajoutez `VITE_ADMIN_CODE`
   pour changer le code formateur.

## Stockage des résultats (Supabase)
Les tentatives (candidat, épreuve, score, détail par domaine, durée) sont
enregistrées dans une base **Supabase** (table `attempts`), ce qui centralise
les statistiques de tous les postes dans le tableau de bord Administration.

1. Configurez les variables d'environnement (fichier `.env` en local, ou
   Site settings → Environment variables sur Netlify) :
   ```
   VITE_SUPABASE_URL=https://<votre-projet>.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_...
   ```
   Utilisez uniquement la clé **publique/publishable** ici — jamais la clé
   `secret`, qui ne doit jamais figurer dans du code côté client.
2. Exécutez une fois, dans l'éditeur SQL de votre projet Supabase, les scripts :
   - `supabase/migrations/0001_create_attempts.sql` (crée la table `attempts`
     et ses règles RLS)
   - `supabase/migrations/0002_add_device_info.sql` (ajoute les colonnes
     `device` et `connection_type`)
   - `supabase/migrations/0003_create_exam_settings.sql` (crée la table
     `exam_settings`, qui permet d'activer/désactiver chaque épreuve depuis
     le tableau de bord)
   - `supabase/migrations/0004_create_students.sql` (crée la table `students`,
     qui associe un CIN à un stagiaire — nom, groupe, établissement)
   - `supabase/migrations/0005_add_cin_to_attempts.sql` (ajoute la colonne
     `cin` à la table `attempts`, pour relier chaque tentative au stagiaire)
   - `supabase/migrations/0006_scope_exam_settings_by_establishment.sql`
     (rend les réglages d'épreuves propres à chaque établissement)
   - `supabase/migrations/0007_add_attempts_delete_policy.sql` — **correctif
     important** : sans cette politique, le bouton « Tout effacer » du
     tableau de bord échouait silencieusement (RLS bloquait la suppression
     sans renvoyer d'erreur)
3. Si `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` ne sont pas définis,
   l'application bascule automatiquement sur le **localStorage** du
   navigateur (comportement d'origine, utile en local sans configuration).

⚠️ La clé publique Supabase est intégrée au bundle JS et donc visible par
n'importe qui (comportement normal de Supabase, protégé par les règles RLS
définies dans la migration). Le code d'accès formateur (`VITE_ADMIN_CODE`)
reste une simple protection d'interface, pas une authentification réelle —
n'y stockez pas de données sensibles au-delà de ce que permettent les
règles RLS de la table `attempts`.

## Confidentialité (loi 09-08 — CNDP)
Le nom, le groupe, l'établissement, le score, ainsi qu'un identifiant
d'appareil approximatif (ex. « Android », « iPhone », « Windows PC ») et le
type de connexion réseau (Wi-Fi / 4G / etc., quand le navigateur l'expose)
sont enregistrés dans la base Supabase du centre de formation à des fins de
suivi pédagogique interne uniquement — aucun partage avec des tiers, aucune utilisation
commerciale. Les données peuvent être supprimées à tout moment depuis
l'espace Administration (« Tout effacer »). Si Supabase n'est pas configuré, les
données restent locales au navigateur. Ce point est rappelé aux candidats
sur la page de connexion et dans le tableau de bord
(`src/components/PrivacyNotice.jsx`).

## Établissements & accès formateur/directeur
Quatre établissements sont gérés (liste dans `src/lib/establishments.js`) :
- INSTITUT SPECIALISE DE TECHNOLOGIE APPLIQUEE AIN AOUDA
- INSTITUT SPECIALISE DE TECHNOLOGIE APPLIQUEE AIN ATIQ *(seul à utiliser le
  flux CIN — voir plus bas)*
- INSTITUT SPECIALISE DE TECHNOLOGIE APPLIQUEE MULTISECTORIEL TEMARA
- INSTITUT SPECIALISE DE TECHNOLOGIE APPLIQUEE TEMARA

Chaque établissement a son propre **code d'accès formateur**, partagé par
tous ses formateurs — c'est le seul moyen d'entrer dans `/admin`. Il n'existe
ni code directeur séparé, ni code « tous établissements » : chaque code
n'ouvre que les stagiaires et statistiques de son établissement, aucun code
ne donne de vue globale multi-établissement.

Codes par défaut (à changer via variables d'environnement Netlify en
production — voir noms de variables dans `src/pages/Admin.jsx`) :

| Établissement | Code d'accès |
|---|---|
| Ain Aouda | `AINAOUDA2026` |
| Ain Atiq | `AINATIQ2026` |
| Multisectoriel Témara | `MULTITEMARA2026` |
| Témara | `TEMARA2026` |

Le tableau de bord (tentatives, stagiaires, groupes, graphes, activation des
épreuves, « Tout effacer ») ne montre/affecte que l'établissement du code
saisi. Ces codes restent une protection d'interface, pas une authentification
par compte individuel (voir avertissement Supabase ci-dessus).

## Authentification par CIN
Le stagiaire saisit son **CIN** (carte d'identité nationale) sur la page de
connexion. Au moment où il quitte le champ (ou appuie sur Entrée) :
- s'il est déjà connu (table `students`), ses informations (nom, groupe,
  établissement) s'affichent automatiquement — il n'a plus qu'à choisir
  l'épreuve et cliquer sur « Commencer » ;
- sinon, les champs restent vides pour une première saisie ; ces
  informations sont enregistrées (associées à ce CIN) dès qu'il clique sur
  « Commencer », créant ainsi son profil pour les prochaines fois — y
  compris depuis un autre poste, puisque la reconnaissance passe par
  Supabase et non par le navigateur.

Chaque tentative est ensuite reliée à ce CIN dans la table `attempts`,
alimentant l'historique complet du stagiaire (voir « Statistiques par
stagiaire » dans le tableau de bord). Logique dans `src/lib/students.js`.

## Statistiques formateur
En plus du tableau des tentatives, le tableau de bord (`/admin`) affiche :
- **Statistiques par stagiaire** — CIN, nom, groupe, nombre de tentatives,
  score moyen, meilleur score, date de dernière activité.
- **Engagement par groupe** — nombre de stagiaires distincts, nombre de
  tentatives, score moyen et taux de réussite par groupe.

Ces deux tableaux respectent les filtres actifs (recherche, groupe, épreuve).
La recherche filtre aussi bien par nom que par CIN.

Les trois tableaux (tentatives, stagiaires, groupes) affichent **10 lignes
par page** (précédent/suivant) et se **trient par colonne** — cliquez sur un
en-tête pour trier, un second clic inverse l'ordre.

### Graphes
Trois graphiques (`recharts`) résument visuellement les mêmes données
filtrées :
- **Courbe** — évolution chronologique du score des tentatives filtrées.
- **Secteurs (donut)** — répartition réussite / échec.
- **Barres** — score moyen par groupe.

Pour peupler ces graphes avec un historique de démonstration (stagiaire
« Yacine BOULYALI », CIN `AD239604`, 10 tentatives réparties sur ~6 semaines) :
```
node --env-file=.env scripts/seed-test-profile.mjs
```
(nécessite Supabase configuré et les migrations 0001 à 0007 exécutées).

## Mobile-first & PWA
L'interface est conçue mobile-first (barre d'examen, cartes, typographie et
zones tactiles optimisées pour petits écrans, zones sûres iOS gérées via
`env(safe-area-inset-*)`). L'application est aussi une **PWA installable**
(`vite-plugin-pwa`) :
- Manifeste + service worker générés automatiquement au build
  (`npm run build`), avec mise en cache des assets pour un chargement rapide
  et un fonctionnement hors-ligne partiel.
- Icônes (`public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`,
  `apple-touch-icon.png`) générées à partir du logo OFPPT.
- Sur mobile (Android/Chrome ou iOS/Safari « Ajouter à l'écran d'accueil »),
  le site s'installe comme une app avec sa propre icône, sans barre d'adresse.
- Les requêtes vers Supabase ne sont jamais mises en cache (toujours en
  réseau direct) pour garantir des scores et statistiques à jour.

## Menu de navigation (profil)
Une icône ☰ en haut à gauche de chaque page ouvre un tiroir de navigation
depuis la droite, commun à tous les types d'utilisateurs :
- **Candidat** (pendant/après une épreuve) — affiche nom, groupe,
  établissement et l'épreuve en cours ; liens vers l'accueil et, si un
  résultat existe, la page Résultats. Quitter une épreuve en cours depuis le
  menu demande une confirmation (progression perdue).
- **Formateur/Directeur** (connecté sur `/admin`) — affiche l'établissement
  géré (ou « Tous les établissements ») ; lien vers le tableau de bord.
- **Visiteur** (personne connecté) — liens vers l'accueil et l'espace
  formateur, pas de profil ni de déconnexion.

Le bouton « Se déconnecter » efface la session correspondante
(`mos_candidate` / `mos_admin_access`) et revient à l'accueil. Logique dans
`src/lib/session.js` et `src/components/NavDrawer.jsx`.

## Thème clair / sombre
Un bouton flottant en haut à droite de chaque page (🖥️/☀️/🌙) permet de
basculer entre **Système** (suit les préférences de l'OS/navigateur, réglage
par défaut), **Clair** et **Sombre**. Le choix est mémorisé (`localStorage`)
et appliqué sans flash au chargement via un petit script inline dans
`index.html`. Logique dans `src/lib/theme.js` et `src/components/ThemeToggle.jsx`.

## Compatibilité navigateurs
Cible : Chrome/Edge ≥ 70, Firefox ≥ 63, Safari/iOS ≥ 12 (voir `.browserslistrc`).
- `@vitejs/plugin-legacy` génère au build un bundle transpilé (Babel +
  polyfills `core-js`) chargé automatiquement par les navigateurs plus
  anciens, en plus du bundle moderne — aucune action requise, tout se fait
  à `npm run build`.
- Autoprefixer (`postcss.config.js`) ajoute les préfixes CSS nécessaires.
- Repli `:focus` pour les navigateurs sans `:focus-visible` (Safari < 15.4).
- Les fonctionnalités dépendant du navigateur (thème système, type de
  connexion réseau, service worker PWA) se dégradent silencieusement sur les
  navigateurs qui ne les supportent pas, sans casser le reste de l'app.

## Modifier les questions
Éditez `src/questions-excel.json`, `src/questions-word.json`,
`src/questions-powerpoint.json` ou `src/questions-excel-expert.json`
(domaines → questions → `q`, `opts`, `ans` = index 0-3 de la bonne réponse).
Pour ajouter une nouvelle épreuve, créez un fichier JSON similaire et
déclarez-le dans `src/lib/exams.js` (objet `EXAMS`).
