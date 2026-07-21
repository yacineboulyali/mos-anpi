// Détection best-effort de l'appareil et du type de connexion réseau du
// candidat, à des fins statistiques uniquement (aucune donnée précise de
// géolocalisation ou d'identifiant unique n'est collectée).

export function getDeviceInfo() {
  const ua = navigator.userAgent || "";

  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) {
    const match = ua.match(/Android[^;]*;\s*([^)]+)\)/i);
    const model = match ? match[1].split("Build")[0].trim() : "";
    return model ? `Android — ${model}` : "Android";
  }
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Linux/i.test(ua)) return "Linux";
  return "Appareil inconnu";
}

export function getConnectionInfo() {
  const conn =
    navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return "Inconnue";

  if (conn.type === "wifi") return "Wi-Fi";
  if (conn.type === "ethernet") return "Ethernet";
  if (conn.type === "cellular" || conn.effectiveType) {
    return conn.effectiveType ? conn.effectiveType.toUpperCase() : "Cellulaire";
  }
  return "Inconnue";
}
