/* Tageswissen – alle Live-Quellen
 * Jede Funktion holt ihre Daten frisch aus dem Netz. Nur Quellen mit Abruflimit
 * (Raketenstarts, NASA) werden kurz zwischengespeichert, damit das Limit nicht greift. */
const Q = window.TW_QUELLEN = {};
const C = window.TW_CONFIG;

const merke = {
  lies(k, maxMin) {
    try {
      const e = JSON.parse(localStorage.getItem("tw:" + k));
      if (e && Date.now() - e.t < maxMin * 60000) return e.d;
    } catch (_) {}
    return null;
  },
  schreib(k, d) { try { localStorage.setItem("tw:" + k, JSON.stringify({ t: Date.now(), d })); } catch (_) {} }
};

/* Nachrichten & Wissenschaft – über den eigenen Cloudflare-Worker */
Q.nachrichten = async () => {
  if (C.WORKER_URL) {
    const d = await TW.holeJSON(C.WORKER_URL.replace(/\/$/, "") + "/", 15000);
    return d;
  }
  // Ohne Worker: Tagesschau direkt versuchen (klappt nur, wenn die Tagesschau es erlaubt)
  const j = await TW.holeJSON("https://www.tagesschau.de/api2u/homepage/", 8000);
  const liste = (j.news || []).filter(n => n.title).map(n => ({
    quelle: "tagesschau", titel: n.title, dachzeile: n.topline || "", text: n.firstSentence || "",
    link: n.shareURL || n.detailsweb, zeit: n.date,
    bild: n.teaserImage?.imageVariants?.["16x9-960"] || null, eil: !!n.breakingNews
  }));
  return { erstellt: new Date().toISOString(), eilmeldungen: liste.filter(n => n.eil), top: liste.slice(0, 8),
           schlagzeilen: liste.slice(4, 20), wissenschaft: [], ohneWorker: true };
};

/* Standort: Browser fragen, sonst Ort aus den Einstellungen */
Q.ort = () => new Promise(res => {
  const gemerkt = merke.lies("ort", 60 * 24 * 7);
  if (gemerkt) return res(gemerkt);
  if (!C.STANDORT_ERFRAGEN || !navigator.geolocation) return res(C.ORT);
  navigator.geolocation.getCurrentPosition(async pos => {
    const o = { lat: +pos.coords.latitude.toFixed(3), lon: +pos.coords.longitude.toFixed(3), name: "" };
    try {
      const g = await TW.holeJSON(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${o.lat}&longitude=${o.lon}&localityLanguage=de`, 5000);
      o.name = g.city || g.locality || "";
    } catch (_) {}
    merke.schreib("ort", o);
    res(o);
  }, () => res(C.ORT), { timeout: 5000, maximumAge: 36e5 });
});

/* Wetter, Sonne, Tageslänge – Open-Meteo (frei, ohne Schlüssel) */
Q.wetter = async ort => {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${ort.lat}&longitude=${ort.lon}` +
    `&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,daylight_duration` +
    `&timezone=auto&forecast_days=1`;
  const j = await TW.holeJSON(u);
  return {
    temp: Math.round(j.current.temperature_2m), code: j.current.weather_code,
    max: Math.round(j.daily.temperature_2m_max[0]), min: Math.round(j.daily.temperature_2m_min[0]),
    auf: j.daily.sunrise[0].slice(11, 16), unter: j.daily.sunset[0].slice(11, 16),
    tageslaenge: j.daily.daylight_duration[0]
  };
};

/* Schulferien & Feiertage – OpenHolidays API */
Q.ferien = async () => {
  const heute = new Date(); const bis = new Date(Date.now() + 400 * 864e5);
  const p = `countryIsoCode=DE&subdivisionCode=${C.BUNDESLAND}&languageIsoCode=DE&validFrom=${TW.isoTag(heute)}&validTo=${TW.isoTag(bis)}`;
  const [schule, feiertage] = await Promise.all([
    TW.holeJSON("https://openholidaysapi.org/SchoolHolidays?" + p).catch(() => []),
    TW.holeJSON("https://openholidaysapi.org/PublicHolidays?" + p).catch(() => [])
  ]);
  const name = e => (e.name?.find(n => n.language === "DE") || e.name?.[0] || {}).text || "";
  return {
    schule: schule.map(e => ({ name: name(e), von: e.startDate, bis: e.endDate })),
    feiertage: feiertage.map(e => ({ name: name(e), von: e.startDate, bis: e.endDate }))
  };
};

/* Heute vor … Jahren – Wikipedia (deutsch) */
Q.heute = async () => {
  const d = new Date();
  const u = `https://api.wikimedia.org/feed/v1/wikipedia/de/onthisday/selected/${TW.zweistellig(d.getMonth() + 1)}/${TW.zweistellig(d.getDate())}`;
  const j = await TW.holeJSON(u);
  const liste = (j.selected || []).filter(e => e.text && e.year);
  const passt = e => C.WISSEN_STICHWORTE.some(w => e.text.toLowerCase().includes(w.toLowerCase()));
  const wahl = liste.find(passt) || liste[0];
  if (!wahl) throw new Error("leer");
  const seite = wahl.pages?.[0];
  return {
    jahr: wahl.year, text: wahl.text,
    link: seite?.content_urls?.desktop?.page || `https://de.wikipedia.org/wiki/${d.getDate()}._${TW.MONATE[d.getMonth()]}`,
    wissen: passt(wahl)
  };
};

/* Weltraumbild des Tages – NASA APOD */
Q.apod = async () => {
  const gemerkt = merke.lies("apod-" + TW.isoTag(new Date()), 60 * 6);
  if (gemerkt) return gemerkt;
  const j = await TW.holeJSON(`https://api.nasa.gov/planetary/apod?api_key=${C.NASA_KEY}&thumbs=true`);
  const d = {
    titel: j.title, bild: j.media_type === "image" ? (j.url || j.hdurl) : (j.thumbnail_url || null),
    link: `https://apod.nasa.gov/apod/ap${j.date.slice(2).replace(/-/g, "")}.html`,
    datum: j.date, rechte: j.copyright ? j.copyright.trim() : "NASA"
  };
  merke.schreib("apod-" + TW.isoTag(new Date()), d);
  return d;
};

/* Nächster Raketenstart – Launch Library 2 (The Space Devs) */
Q.start = async () => {
  const gemerkt = merke.lies("start", 20);
  if (gemerkt) return gemerkt;
  const j = await TW.holeJSON("https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=6&mode=normal");
  const jetzt = Date.now() - 60 * 60000;
  const s = (j.results || []).find(r => Date.parse(r.net) > jetzt) || j.results?.[0];
  if (!s) throw new Error("leer");
  const d = {
    name: s.mission?.name || s.name,
    rakete: s.rocket?.configuration?.full_name || s.rocket?.configuration?.name || (s.name || "").split("|")[0].trim(),
    anbieter: s.launch_service_provider?.name || "",
    ort: s.pad?.location?.name || s.pad?.name || "",
    zeit: s.net,
    status: s.status?.name || s.status?.abbrev || "",
    link: "https://www.google.com/search?q=" + encodeURIComponent((s.name || "") + " launch")
  };
  merke.schreib("start", d);
  return d;
};
