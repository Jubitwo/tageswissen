/* Tageswissen – Aufbau der Seite */
(() => {
  const C = window.TW_CONFIG, Q = window.TW_QUELLEN, $ = id => document.getElementById(id), e = TW.esc;
  let letzteDaten = null;

  /* Sport wird auch hier ausgefiltert – falls der Worker noch eine ältere Version ist */
  const SPORT_ADRESSE = /\/sport|\/fussball|\/football|sportschau|kicker\.de|\/bundesliga/i;
  const SPORT_WORT = /(bundesliga|fu(ß|ss)ball|eishockey|handball|basketball|volleyball|tennis|formel[ -]?1|champions[- ]league|europa league|\bdfb\b|\bfifa\b|\buefa\b|olympi|biathlon|skispring|leichtathletik|torwart|elfmeter|premier league|\bnba\b|\bnfl\b|wimbledon|tour de france|nationalmannschaft|bayern münchen|\bbvb\b|borussia|schalke|\bvfb\b|rb leipzig|werder|\bfc [a-zäöü]|\bwm-|-wm\b|-em\b|weltcup)/i;
  const keinSport = i => !(SPORT_ADRESSE.test(i.link || "") || SPORT_WORT.test((i.titel || "") + " " + (i.dachzeile || "")));

  /* ---------- Linke Spalte ---------- */
  function datumUndUhr() {
    const d = new Date();
    $("uhr").textContent = TW.uhrzeit(d);
    $("datum").innerHTML = `${TW.TAGE[d.getDay()]}, ${d.getDate()}. ${TW.MONATE[d.getMonth()]}<span>${d.getFullYear()}, Kalenderwoche ${TW.kw(d)}</span>`;
  }

  /* Plastischer Mond: beleuchteter Teil mit Verlauf und Kratern, dunkler Teil mit Erdschein */
  function mondSVG(p) {
    const R = 56, k = Math.cos(2 * Math.PI * p), rx = Math.abs(k) * R;
    const pfad = p < .5
      ? `M0,${-R} A${R},${R} 0 0 1 0,${R} A${rx},${R} 0 0 ${k > 0 ? 0 : 1} 0,${-R}Z`
      : `M0,${-R} A${R},${R} 0 0 0 0,${R} A${rx},${R} 0 0 ${k > 0 ? 1 : 0} 0,${-R}Z`;
    const krater = [[-18,-22,9],[20,-8,6],[-6,18,11],[24,26,5],[-30,8,5],[6,-36,4],[34,-28,3]]
      .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#000" opacity=".09"/>`).join("");
    return `<svg viewBox="-70 -70 140 140" aria-hidden="true">
      <defs>
        <radialGradient id="m-hell" cx="38%" cy="32%" r="78%"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#e6e6ea"/><stop offset="1" stop-color="#a9a9b0"/></radialGradient>
        <radialGradient id="m-dunkel" cx="40%" cy="35%" r="80%"><stop offset="0" stop-color="#1e1e21"/><stop offset="1" stop-color="#09090a"/></radialGradient>
        <filter id="m-glanz" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="9"/></filter>
        <clipPath id="m-teil"><path d="${pfad}"/></clipPath>
      </defs>
      <path d="${pfad}" fill="#fff" opacity=".35" filter="url(#m-glanz)"/>
      <circle r="${R}" fill="url(#m-dunkel)"/>
      <g clip-path="url(#m-teil)"><circle r="${R}" fill="url(#m-hell)"/>${krater}</g>
      <circle r="${R}" fill="none" stroke="rgba(255,255,255,.10)"/>
    </svg>`;
  }

  function zeichneMond() {
    const m = TW.mond();
    const f = d => d.toLocaleDateString("de-DE", { day: "numeric", month: "long" });
    const naechstes = m.p < .5 ? `Vollmond am ${f(m.voll)}` : `Neumond am ${f(m.neu)}`;
    $("mond").innerHTML = `${mondSVG(m.p)}<div><div class="phase">${e(m.name)}</div><div class="licht">${m.licht} % beleuchtet<br>${naechstes}</div></div>`;
  }

  function ferienText(f) {
    const heute = TW.isoTag(new Date());
    const fei = f.feiertage.find(x => x.von <= heute && x.bis >= heute);
    if (fei) return `Heute ist ${e(fei.name)}`;
    const jetzt = f.schule.find(x => x.von <= heute && x.bis >= heute);
    if (jetzt) {
      const rest = Math.round((new Date(jetzt.bis) - new Date(heute)) / 864e5);
      return `${e(jetzt.name)}, noch ${rest} ${rest === 1 ? "Tag" : "Tage"}`;
    }
    const naechste = f.schule.filter(x => x.von > heute && /ferien/i.test(x.name)).sort((a, b) => a.von.localeCompare(b.von))[0];
    if (!naechste) return "–";
    const tage = Math.round((new Date(naechste.von) - new Date(heute)) / 864e5);
    return `${tage} Tage bis zu den ${e(naechste.name)}`;
  }

  function zeichneHeute(h) {
    const jahre = new Date().getFullYear() - h.jahr;
    $("heute").innerHTML = `<a href="${e(h.link)}" target="_blank" rel="noopener">
      <div class="kopf">Heute vor</div>
      <div class="jahre zahl">${jahre}<small>Jahren, ${h.jahr}</small></div>
      <p class="titel">${e(h.text)}</p></a>`;
  }

  /* ---------- Mitte: Nachrichten ---------- */
  function zeichneNachrichten(roh) {
    letzteDaten = roh;
    const d = {
      ...roh,
      eilmeldungen: (roh.eilmeldungen || []).filter(keinSport),
      top: (roh.top || []).filter(keinSport),
      schlagzeilen: (roh.schlagzeilen || []).filter(keinSport),
      wissenschaft: (roh.wissenschaft || []).filter(keinSport)
    };

    const eil = d.eilmeldungen[0], eilEl = $("eil");
    if (eil) {
      eilEl.classList.add("an");
      eilEl.href = eil.link;
      $("eil-titel").textContent = eil.titel;
      $("eil-wann").textContent = TW.relZeit(eil.zeit);
    } else eilEl.classList.remove("an");

    const top = d.top.filter(t => !t.eil);
    const haupt = top.find(t => t.bild) || top[0];
    $("k-top").innerHTML = haupt ? `
      <a href="${e(haupt.link)}" target="_blank" rel="noopener">
        ${haupt.bild ? `<img src="${e(haupt.bild)}" alt="">` : ""}
        <div class="verlauf"></div>
        <div class="inhalt">
          <div class="meta"><b>tagesschau</b>${haupt.dachzeile ? `&ensp;${e(haupt.dachzeile)}` : ""}&ensp;${e(TW.relZeit(haupt.zeit))}</div>
          <h1 class="titel">${e(haupt.titel)}</h1>
          ${haupt.text ? `<p>${e(haupt.text)}</p>` : ""}
        </div>
      </a>` : `<div class="inhalt"><p class="hinweis">Die Tagesschau ist gerade nicht erreichbar.</p></div>`;

    const wiss = ausgewogen(d.wissenschaft, 1);
    $("k-wiss").innerHTML = `<h2>Wissenschaft <small>${anzahlQuellen(d.wissenschaft)} Quellen</small></h2>` +
      (wiss.length ? `<div class="liste">${wiss.slice(0, 3).map(x => eintrag(x, true)).join("")}</div>` : leer(d));

    // Weitere Nachrichten: ohne Doppelung zum Top-Thema, höchstens eine je Quelle vorne
    const schlag = ausgewogen(d.schlagzeilen, 1);
    $("k-news").innerHTML = `<h2>Nachrichten <small>ohne Sport</small></h2>` +
      (schlag.length ? `<div class="liste">${schlag.slice(0, 4).map(x => eintrag(x)).join("")}</div>` : leer(d));

    const ok = Object.values(d.quellen || {}).filter(v => v === "ok").length;
    const alle = Object.keys(d.quellen || {}).length;
    $("stand").textContent = `Stand ${TW.uhrzeit(new Date(d.erstellt || Date.now()))}` + (alle ? `, ${ok} von ${alle} Quellen erreichbar` : "");
    $("stand").title = Object.entries(d.quellen || {}).map(([k, v]) => `${k}: ${v}`).join("\n");

    document.querySelectorAll(".liste").forEach(TW.passend);
  }

  function ausgewogen(liste, n) {
    const zaehler = {}, vorne = [], hinten = [];
    for (const x of liste) ((zaehler[x.quelle] = (zaehler[x.quelle] || 0) + 1) <= n ? vorne : hinten).push(x);
    return [...vorne, ...hinten];
  }
  const anzahlQuellen = l => new Set(l.map(x => x.quelle)).size;
  const eintrag = (x, mitText) => `
    <a href="${e(x.link)}" target="_blank" rel="noopener">
      <div class="quelle">${e(x.quelle)}<i>${e(TW.relZeit(x.zeit))}</i></div>
      <div class="titel">${e(x.titel)}</div>
      ${mitText && x.text ? `<div class="text">${e(x.text)}</div>` : ""}
    </a>`;
  const leer = d => d.ohneWorker
    ? `<p class="hinweis"><b>Nachrichtendienst nicht verbunden.</b> Worker-Adresse in js/config.js eintragen.</p>`
    : `<p class="hinweis">Gerade keine Meldungen erreichbar.</p>`;

  /* ---------- Rechts: Für den Unterricht ---------- */
  function schultagNr() {
    const start = new Date(window.TW_UNTERRICHT.START + "T12:00:00"), heute = new Date(); heute.setHours(12, 0, 0, 0);
    let n = 0;
    for (let d = new Date(start); d <= heute; d.setDate(d.getDate() + 1)) { const w = d.getDay(); if (w !== 0 && w !== 6) n++; }
    return Math.max(0, n - 1); // am Wochenende bleibt der Freitag stehen
  }
  const verschiebung = { MATHE: 0, PHYSIK: 0 };
  function waehleFakt(fach) {
    const liste = window.TW_UNTERRICHT[fach];
    const i = schultagNr() + verschiebung[fach];
    return liste[((i * 37) % liste.length + liste.length) % liste.length]; // Klassenstufen gemischt
  }
  function faktHTML(fach, name) {
    const x = waehleFakt(fach);
    return `<div class="fakt">
      <div class="fach"><b>${name}</b><span>Klasse ${e(x.k)}, ${e(x.th)}</span>
        <button class="weiter" data-fach="${fach}" aria-label="Anderen ${name}-Fakt zeigen">Anderer Fakt</button></div>
      <h3>${e(x.t)}</h3>
      <p>${e(x.f)}</p>
      <div class="idee">${e(x.u)}</div>
    </div>`;
  }
  function zeichneUnterricht() {
    if (!window.TW_UNTERRICHT) return;
    $("k-unt").innerHTML = `<div class="zeichen" aria-hidden="true">π</div>
      <h2>Für den Unterricht<small>Mathe und Physik, Klasse 5 bis 10</small></h2>
      ${faktHTML("MATHE", "Mathematik")}${faktHTML("PHYSIK", "Physik")}`;
  }
  document.addEventListener("click", ev => {
    const b = ev.target.closest(".weiter"); if (!b) return;
    verschiebung[b.dataset.fach]++; zeichneUnterricht();
  });

  /* ---------- Rechts: Raketenstart ---------- */
  let startZeit = null;
  function zeichneStart(s) {
    startZeit = Date.parse(s.zeit);
    const wann = new Date(s.zeit).toLocaleString("de-DE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    $("k-start").innerHTML = `
      <h2>Nächster Raketenstart <small>${e(wann)} Uhr</small></h2>
      <a href="${e(s.link)}" target="_blank" rel="noopener"><div class="mission titel">${e(s.name)}</div></a>
      <div class="meta">${s.unbekannt ? "Nutzlast nicht veröffentlicht" : e(s.rakete)}, ${e(s.anbieter)}, ${e(s.ort)}</div>
      <div class="countdown zahl" id="countdown"></div>`;
    tickStart();
  }
  function tickStart() {
    const el = $("countdown"); if (!el || !startZeit) return;
    let s = Math.round((startZeit - Date.now()) / 1000);
    const vorbei = s < 0; s = Math.abs(s);
    const t = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sek = s % 60, z = TW.zweistellig;
    el.innerHTML = (vorbei ? `<div><b>+</b><span>gestartet</span></div>` : "") +
      (t ? `<div><b>${t}</b><span>${t === 1 ? "Tag" : "Tage"}</span></div>` : "") +
      `<div><b>${z(h)}</b><span>Std.</span></div><div><b>${z(m)}</b><span>Min.</span></div><div><b>${z(sek)}</b><span>Sek.</span></div>`;
  }

  /* ---------- Laden ---------- */
  async function ladeNachrichten() {
    try { zeichneNachrichten(await Q.nachrichten()); }
    catch (_) {
      zeichneNachrichten({ eilmeldungen: [], top: [], schlagzeilen: [], wissenschaft: [], ohneWorker: !C.WORKER_URL });
      $("stand").textContent = "Nachrichten gerade nicht erreichbar";
    }
  }

  function ladeAlles() {
    datumUndUhr(); zeichneMond(); zeichneUnterricht();
    ladeNachrichten();
    Q.start().then(zeichneStart).catch(() => { $("k-start").innerHTML = `<h2>Nächster Raketenstart</h2><p class="hinweis">Startkalender gerade nicht erreichbar.</p>`; });
    Q.heute().then(zeichneHeute).catch(() => { $("heute").innerHTML = ""; });
    Q.ferien().then(f => { $("ferien").innerHTML = ferienText(f); }).catch(() => {});
    Q.ort().then(async ort => {
      try {
        const w = await Q.wetter(ort);
        $("wetter").innerHTML = `${w.temp}°, ${e(TW.wetter(w.code))}<br><small>${ort.name ? e(ort.name) + ", " : ""}${w.min}° bis ${w.max}°</small>`;
        const tl = Math.round(w.tageslaenge / 60);
        $("sonne").innerHTML = `${w.auf} bis ${w.unter}<br><small>${Math.floor(tl / 60)} h ${tl % 60} min Tageslicht</small>`;
      } catch (_) {}
    });
  }

  ladeAlles();
  setInterval(() => { datumUndUhr(); tickStart(); }, 1000);
  setInterval(ladeNachrichten, C.AKTUALISIEREN_MINUTEN * 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) ladeNachrichten(); });
  let warte; addEventListener("resize", () => { clearTimeout(warte); warte = setTimeout(() => letzteDaten && zeichneNachrichten(letzteDaten), 200); });

  const mitternacht = new Date(); mitternacht.setHours(24, 0, 30, 0);
  setTimeout(() => location.reload(), mitternacht - Date.now());
})();
