import { useEffect } from "react";
import QRCode from "react-qr-code";

const LINKEDIN_URL = "https://www.linkedin.com/in/yacineboulyali/";

export default function AboutModal({ onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="about-overlay" onClick={onClose}>
      <div className="card about-modal" onClick={(e) => e.stopPropagation()}>
        <button className="about-close" onClick={onClose} aria-label="Fermer">✕</button>
        <div className="about-photo-placeholder" aria-hidden="true">YB</div>
        <h2 className="about-name">Yacine BOULYALI</h2>
        <p className="about-role">Formateur — Créateur de l'application</p>
        <a className="btn" href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
          🔗 Voir le profil LinkedIn
        </a>
        <div className="about-qr">
          <div className="about-qr-code">
            <QRCode value={LINKEDIN_URL} size={128} fgColor="#0B3D36" />
          </div>
          <p>Scannez pour me suivre sur LinkedIn</p>
        </div>
      </div>
    </div>
  );
}
