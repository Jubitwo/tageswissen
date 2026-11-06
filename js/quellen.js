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
    `&current=temperature_2m,weather_code` +
    `&hourly=temperature_2m,precipitation_probability,weather_code&forecast_hours=13` +
    `&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,daylight_duration,weather_code,precipitation_probability_max` +
    `&timezone=auto&forecast_days=2`;
  const j = await TW.holeJSON(u);
  const d = j.daily, h = j.hourly;
  return {
    temp: Math.round(j.current.temperature_2m), code: j.current.weather_code,
    max: Math.round(d.temperature_2m_max[0]), min: Math.round(d.temperature_2m_min[0]),
    auf: d.sunrise[0].slice(11, 16), unter: d.sunset[0].slice(11, 16),
    tageslaenge: d.daylight_duration[0],
    stunden: h.time.map((t, i) => ({ uhr: t.slice(11, 13), temp: h.temperature_2m[i], regen: h.precipitation_probability[i] ?? 0, code: h.weather_code[i] })),
    morgen: { min: Math.round(d.temperature_2m_min[1]), max: Math.round(d.temperature_2m_max[1]), code: d.weather_code[1], regen: d.precipitation_probability_max[1] ?? 0 }
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
  const basis = "https://api.wikimedia.org/feed/v1/wikipedia/de/onthisday";
  const tag = `${TW.zweistellig(d.getMonth() + 1)}/${TW.zweistellig(d.getDate())}`;
  const hole = typ => TW.holeJSON(`${basis}/${typ}/${tag}`).then(j => (j[typ] || []).filter(e => e.text && e.year)).catch(() => []);
  const [geburten, tode, ereignisse, ausgewaehlt] = await Promise.all([hole("births"), hole("deaths"), hole("events"), hole("selected")]);
  const FORSCHUNG = /(physiker|mathematiker|chemiker|astronom|naturwissenschaftler|informatiker|biolog|erfinder|ingenieur|raumfahrer|astronaut|kosmonaut|geolog|nobelpreis|forscher)/i;
  const passtWissen = e => C.WISSEN_STICHWORTE.some(w => e.text.toLowerCase().includes(w.toLowerCase()));
  const link = e => e.pages?.[0]?.content_urls?.desktop?.page || `https://de.wikipedia.org/wiki/${d.getDate()}._${TW.MONATE[d.getMonth()]}`;
  const person = (e, art) => {
    const teile = e.text.split(/,\s*/);
    return { art, jahr: e.year, name: (e.pages?.[0]?.titles?.normalized || teile[0]).replace(/\s*\(.*\)$/, ""),
             text: teile.slice(1).join(", ").replace(/\s*\(†.*?\)|\s*\(\*.*?\)/g, "").trim() || e.text, link: link(e) };
  };
  // Bevorzugt: berühmte Forscherinnen und Forscher (die mit dem längsten Wikipedia-Eintrag zuerst)
  const bekannt = l => l.filter(e => FORSCHUNG.test(e.text)).sort((a, b) => (b.pages?.[0]?.extract?.length || 0) - (a.pages?.[0]?.extract?.length || 0));
  const g = bekannt(geburten)[0]; if (g) return person(g, "geboren");
  const t = bekannt(tode)[0]; if (t) return person(t, "gestorben");
  const ev = [...ausgewaehlt, ...ereignisse].find(passtWissen) || ausgewaehlt[0] || ereignisse[0];
  if (!ev) throw new Error("leer");
  return { art: "ereignis", jahr: ev.year, text: ev.text, link: link(ev) };
};

/* Nächster Raketenstart – Launch Library 2 (The Space Devs) */
Q.start = async () => {
  const gemerkt = merke.lies("start2", 20);
  if (gemerkt) return gemerkt;
  const j = await TW.holeJSON("https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=15&mode=normal");
  const jetzt = Date.now() - 60 * 60000;
  const kommend = (j.results || []).filter(r => Date.parse(r.net) > jetzt);
  // Spannende Starts zuerst: mit Crew, Mond, große Raketen, europäische Starts
  const SPANNEND = /(crew|artemis|orion|starship|falcon heavy|new glenn|ariane|vega|soyuz ms|shenzhou|axiom|dragon|starliner|esa|jaxa|isro|gaganyaan|lunar|moon|mond|mars)/i;
  const text = r => [r.name, r.mission?.name, r.mission?.description, r.launch_service_provider?.name, r.rocket?.configuration?.full_name].join(" ");
  const bald = kommend.filter(r => Date.parse(r.net) - Date.now() < 10 * 864e5);
  const s = bald.find(r => SPANNEND.test(text(r))) || kommend.find(r => SPANNEND.test(text(r)) && Date.parse(r.net) - Date.now() < 21 * 864e5) || kommend[0] || j.results?.[0];
  if (!s) throw new Error("leer");
  const mission = s.mission?.name || "";
  const unbekannt = !mission || /unknown|unbekannt|tbd/i.test(mission);
  const d = {
    name: unbekannt ? (s.rocket?.configuration?.name || (s.name || "").split("|")[0].trim()) : mission,
    unbekannt,
    rakete: s.rocket?.configuration?.full_name || s.rocket?.configuration?.name || (s.name || "").split("|")[0].trim(),
    anbieter: s.launch_service_provider?.name || "",
    ort: s.pad?.location?.name || s.pad?.name || "",
    zeit: s.net,
    status: s.status?.name || s.status?.abbrev || "",
    crew: /crew|shenzhou|soyuz ms|axiom|gaganyaan|starliner/i.test(text(s)),
    link: "https://www.google.com/search?q=" + encodeURIComponent((s.name || "") + " launch")
  };
  merke.schreib("start2", d);
  return d;
};
