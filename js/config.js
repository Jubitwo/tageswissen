/* Tageswissen – Einstellungen
 * Hier kannst du alles Persönliche anpassen, ohne den restlichen Code anzufassen. */
window.TW_CONFIG = {
  // Adresse deines Cloudflare-Workers (siehe worker/ANLEITUNG-WORKER.md).
  // Beispiel: "https://tageswissen.DEINNAME.workers.dev"
  WORKER_URL: "https://tageswissen.julianbickel.workers.dev",

  // Ort für Wetter, Sonnenauf- und -untergang.
  // Wird nur verwendet, wenn der Browser den Standort nicht freigibt.
  ORT: { name: "Stuttgart", lat: 48.7758, lon: 9.1829 },
  STANDORT_ERFRAGEN: true,

  // Bundesland für Schulferien und Feiertage (ISO-Code), z. B. DE-BW, DE-BY, DE-NW
  BUNDESLAND: "DE-BW",

  // NASA-Schlüssel für das Weltraumbild des Tages. "DEMO_KEY" reicht für den Eigenbedarf.
  // Eigener kostenloser Schlüssel: https://api.nasa.gov
  NASA_KEY: "DEMO_KEY",

  // Helligkeit des Ambient-Lichts hinter der Seite: 0 = ganz schwarz, 0.55 = Standard, 0.85 = hell
  LICHT: 0.55,

  // Wie oft die Seite sich im Hintergrund aktualisiert (Minuten)
  AKTUALISIEREN_MINUTEN: 5,

  // Stichwörter, mit denen „Heute vor … Jahren“ bevorzugt Wissenschaft & Raumfahrt zeigt
  WISSEN_STICHWORTE: ["Satellit", "Raumfahrt", "Rakete", "Mond", "Mars", "Planet", "Komet", "Asteroid",
    "Teleskop", "Astronaut", "Kosmonaut", "NASA", "ESA", "Physik", "Mathemati", "Chemie", "entdeck",
    "Nobelpreis", "Atom", "Elektr", "Raumsonde", "Erfind", "Computer", "Röntgen", "Einstein", "Wissenschaft", "Forscher", "Sputnik", "Umlaufbahn", "Weltraum", "Raumstation", "Sonnenfinsternis", "Erfinder"]
};
