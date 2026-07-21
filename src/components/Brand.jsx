import logo from "../assets/ofppt-logo.png";

export default function Brand({ compact = false, dark = false }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""} ${dark ? "brand-dark" : ""}`}>
      <img src={logo} alt="Logo OFPPT" className="brand-logo" />
      <div className="brand-text">
        <span className="brand-title">OFPPT</span>
        <span className="brand-sub">EFP Témara</span>
      </div>
    </div>
  );
}
