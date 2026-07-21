import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import "./styles.css";
import NavDrawer from "./components/NavDrawer.jsx";
import SoundToggle from "./components/SoundToggle.jsx";
import Login from "./pages/Login.jsx";

// Chargées à la demande : Admin embarque recharts / xlsx / react-qr-code (les
// plus gros modules du projet), inutiles pour un stagiaire qui passe juste une
// épreuve. Séparer ces routes évite de les faire télécharger à tout le monde.
const Exam = lazy(() => import("./pages/Exam.jsx"));
const Results = lazy(() => import("./pages/Results.jsx"));
const Admin = lazy(() => import("./pages/Admin.jsx"));
const MySpace = lazy(() => import("./pages/MySpace.jsx"));

function RouteLoading() {
  return (
    <div style={{ padding: "80px 20px", textAlign: "center", color: "var(--grey)" }}>
      Chargement…
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <SoundToggle />
      <NavDrawer />
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/exam" element={<Exam />} />
          <Route path="/results" element={<Results />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/mon-espace" element={<MySpace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  </React.StrictMode>
);
