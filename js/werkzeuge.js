/* Tageswissen – kleine Hilfsfunktionen */
const TW = window.TW = {};

TW.MONATE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
TW.TAGE = ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];

TW.esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

TW.holeJSON = async (url, ms = 8000) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
};

TW.zweistellig = n => String(n).padStart(2, "0");
TW.uhrzeit = d => TW.zweistellig(d.getHours()) + ":" + TW.zweistellig(d.getMinutes());
TW.isoTag = d => d.getFullYear() + "-" + TW.zweistellig(d.getMonth() + 1) + "-" + TW.zweistellig(d.getDate());

TW.relZeit = iso => {
  if (!iso) return "";
  const d = new Date(iso); if (isNaN(d)) return "";
  const min = Math.round((Date.now() - d) / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return "vor " + min + " Min.";
  if (min < 60 * 6) return "vor " + Math.round(min / 60) + " Std.";
  const heute = new Date(); heute.setHours(0, 0, 0, 0);
  if (d >= heute) return "heute " + TW.uhrzeit(d);
  if (d >= new Date(heute - 864e5)) return "gestern " + TW.uhrzeit(d);
  return d.getDate() + "." + (d.getMonth() + 1) + ".";
};

TW.kw = d => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const tag = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - tag);
  const jahresstart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - jahresstart) / 864e5 + 1) / 7);
};

/* Mondphase – astronomische Näherung, genau auf etwa einen halben Tag */
TW.mond = (zeit = Date.now()) => {
  const SYN = 29.530588853;
  const ref = Date.UTC(2000, 0, 6, 18, 14); // Neumond 6. Januar 2000
  const alter = (((zeit - ref) / 864e5) % SYN + SYN) % SYN;
  const p = alter / SYN;
  const licht = Math.round((1 - Math.cos(2 * Math.PI * p)) / 2 * 100);
  let name;
  if (p < .03 || p >= .97) name = "Neumond";
  else if (p < .22) name = "Zunehmende Sichel";
  else if (p < .28) name = "Erstes Viertel";
  else if (p < .47) name = "Zunehmender Mond";
  else if (p < .53) name = "Vollmond";
  else if (p < .72) name = "Abnehmender Mond";
  else if (p < .78) name = "Letztes Viertel";
  else name = "Abnehmende Sichel";
  const bisVoll = ((.5 - p + 1) % 1) * SYN, bisNeu = ((1 - p) % 1) * SYN;
  return { p, alter, licht, name, voll: new Date(zeit + bisVoll * 864e5), neu: new Date(zeit + bisNeu * 864e5) };
};

TW.mondSVG = (p, groesse = 120) => {
  const R = 56, k = Math.cos(2 * Math.PI * p), rx = Math.abs(k) * R;
  const pfad = p < .5
    ? `M0,${-R} A${R},${R} 0 0 1 0,${R} A${rx},${R} 0 0 ${k > 0 ? 0 : 1} 0,${-R}Z`
    : `M0,${-R} A${R},${R} 0 0 0 0,${R} A${rx},${R} 0 0 ${k > 0 ? 1 : 0} 0,${-R}Z`;
  return `<svg viewBox="-60 -60 120 120" width="${groesse}" height="${groesse}" aria-hidden="true">
    <defs><radialGradient id="mg" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#cfcfd4"/></radialGradient></defs>
    <circle r="${R}" fill="#1a1a1c"/>
    <path d="${pfad}" fill="url(#mg)"/>
    <circle r="${R}" fill="none" stroke="rgba(255,255,255,.12)"/></svg>`;
};

/* Wetter-Codes (WMO) */
TW.wetter = code => {
  const c = Number(code);
  if (c === 0) return "klar";
  if (c <= 2) return "leicht bewölkt";
  if (c === 3) return "bedeckt";
  if (c <= 48) return "Nebel";
  if (c <= 57) return "Nieselregen";
  if (c <= 67) return "Regen";
  if (c <= 77) return "Schnee";
  if (c <= 82) return "Schauer";
  if (c <= 86) return "Schneeschauer";
  return "Gewitter";
};

/* Entfernt Listeneinträge, die nicht mehr ganz in die Kachel passen */
TW.passend = liste => {
  if (!liste) return;
  const kinder = [...liste.children];
  kinder.forEach(k => (k.style.display = ""));
  for (let i = kinder.length - 1; i > 0; i--) {
    const k = kinder[i];
    if (k.offsetTop + k.offsetHeight <= liste.clientHeight + 1) break;
    k.style.display = "none";
  }
};
