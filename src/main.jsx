import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import "./styles.css";
import NavDrawer from "./components/NavDrawer.jsx";
import SoundToggle from "./components/SoundToggle.jsx";
import ExamLockGuard from "./components/ExamLockGuard.jsx";
import Login from "./pages/Login.jsx";
import Portal from "./pages/Portal.jsx";
import AnpiHome from "./pages/AnpiHome.jsx";

// Chargées à la demande : Admin embarque recharts / xlsx / react-qr-code (les
// plus gros modules du projet), inutiles pour un stagiaire qui passe juste une
// épreuve. Séparer ces routes évite de les faire télécharger à tout le monde.
//
// Un onglet resté ouvert à cheval sur un déploiement référence encore les
// anciens fichiers de chunk (hash dans le nom) : le navigateur ne les trouve
// plus sur le serveur, l'import échoue silencieusement et la page reste
// blanche. On recharge alors la page une seule fois pour repartir sur les
// bons fichiers ; le flag en sessionStorage évite une boucle si l'échec a une
// autre cause.
const CHUNK_RELOAD_KEY = "mos_chunk_reload_once";

function lazyWithReload(factory) {
  return lazy(() =>
    factory()
      .then((mod) => {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
        return mod;
      })
      .catch((err) => {
        if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) throw err;
        sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
        window.location.reload();
        return new Promise(() => {}); // le rechargement est en cours, ne rien rendre
      })
  );
}

const Exam = lazyWithReload(() => import("./pages/Exam.jsx"));
const Results = lazyWithReload(() => import("./pages/Results.jsx"));
const Admin = lazyWithReload(() => import("./pages/Admin.jsx"));
const MySpace = lazyWithReload(() => import("./pages/MySpace.jsx"));
const ExamenLogin = lazyWithReload(() => import("./pages/ExamenLogin.jsx"));
const ExamenOfficiel = lazyWithReload(() => import("./pages/ExamenOfficiel.jsx"));
const ExamenResultat = lazyWithReload(() => import("./pages/ExamenResultat.jsx"));

function RouteLoading() {
  return (
    <div style={{ padding: "5rem 1.25rem", textAlign: "center", color: "var(--grey)" }}>
      Chargement…
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <SoundToggle />
      <NavDrawer />
      <ExamLockGuard />
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<Portal />} />
          <Route path="/ofppt" element={<Login />} />
          <Route path="/anpi" element={<AnpiHome />} />
          <Route path="/exam" element={<Exam />} />
          <Route path="/results" element={<Results />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/mon-espace" element={<MySpace />} />
          <Route path="/examen" element={<ExamenLogin />} />
          <Route path="/examen/epreuve" element={<ExamenOfficiel />} />
          <Route path="/examen/resultat" element={<ExamenResultat />} />
        </Routes>
      </Suspense>
    </HashRouter>
  </React.StrictMode>
);
