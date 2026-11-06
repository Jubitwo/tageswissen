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
    if (h.art === "geboren" || h.art === "gestorben") {
      $("heute").innerHTML = `<a href="${e(h.link)}" target="_blank" rel="noopener">
        <div class="kopf">Heute vor ${jahre} Jahren ${h.art}</div>
        <div class="person titel">${e(h.name)}</div>
        <p>${e(h.text)}</p></a>`;
    } else {
      $("heute").innerHTML = `<a href="${e(h.link)}" target="_blank" rel="noopener">
        <div class="kopf">Heute vor</div>
        <div class="jahre zahl">${jahre}<small>Jahren, ${h.jahr}</small></div>
        <p class="titel">${e(h.text)}</p></a>`;
    }
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

    // Die wichtigsten Themen: worüber berichten gerade viele Medien? (ohne das Top-Thema selbst)
    const gleich = (a, b) => a && b && (a.link === b.link || a.titel === b.titel);
    const themen = (d.themen || []).filter(keinSport).filter(t => !gleich(t, haupt));
    if (themen.length) {
      $("k-news").innerHTML = `<h2>Die großen Themen <small>nach Zahl der Medien</small></h2>
        <div class="liste">${themen.slice(0, 4).map(themaEintrag).join("")}</div>`;
    } else {
      const schlag = ausgewogen(d.schlagzeilen, 1);
      $("k-news").innerHTML = `<h2>Nachrichten <small>ohne Sport</small></h2>` +
        (schlag.length ? `<div class="liste">${schlag.slice(0, 4).map(x => eintrag(x)).join("")}</div>` : leer(d));
    }

    // Weltraumbild hinter der Raumfahrt-Kachel
    if (d.raumbild && d.raumbild.bild) zeigeRaumbild(d.raumbild);

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
  const themaEintrag = t => `
    <a href="${e(t.link)}" target="_blank" rel="noopener">
      <div class="quelle">${t.anzahl > 1 ? `<b class="medien">${t.anzahl} Medien</b>` : e(t.quelle)}<i>${e(TW.relZeit(t.zeit))}</i></div>
      <div class="titel">${e(t.titel)}</div>
    </a>`;
  const leer = d => d.ohneWorker
    ? `<p class="hinweis"><b>Nachrichtendienst nicht verbunden.</b> Worker-Adresse in js/config.js eintragen.</p>`
    : `<p class="hinweis">Gerade keine Meldungen erreichbar.</p>`;

  /* ---------- Rechts: Für den Unterricht ---------- */
  const FAECHER = { MATHE: "Mathematik", PHYSIK: "Physik", CHEMIE: "Chemie" };
  function schultagNr() {
    const start = new Date(window.TW_UNTERRICHT.START + "T12:00:00"), heute = new Date(); heute.setHours(12, 0, 0, 0);
    let n = 0;
    for (let d = new Date(start); d <= heute; d.setDate(d.getDate() + 1)) { const w = d.getDay(); if (w !== 0 && w !== 6) n++; }
    return Math.max(0, n - 1); // am Wochenende bleibt der Freitag stehen
  }
  const verschiebung = { MATHE: 0, PHYSIK: 0, CHEMIE: 0 };
  function faktIndex(fach) {
    const liste = window.TW_UNTERRICHT[fach];
    const i = schultagNr() + verschiebung[fach];
    return ((i * 37) % liste.length + liste.length) % liste.length; // Klassenstufen gemischt
  }
  const waehleFakt = fach => window.TW_UNTERRICHT[fach][faktIndex(fach)];
  // Chemie jeden Tag, dazu abwechselnd Mathematik und Physik
  const heutigeFaecher = () => ["CHEMIE", schultagNr() % 2 === 0 ? "MATHE" : "PHYSIK"];

  function faktHTML(fach) {
    const x = waehleFakt(fach), name = FAECHER[fach];
    return `<div class="fakt">
      <div class="fach"><b>${name}</b><span>Klasse ${e(x.k)}, ${e(x.th)}</span>
        <button class="weiter" data-fach="${fach}" aria-label="Anderen ${name}-Fakt zeigen">Anderer Fakt</button></div>
      <button class="fakt-gross" data-fach="${fach}" title="Im Beamer-Modus zeigen"><h3>${e(x.t)}</h3></button>
      <p>${e(x.f)}</p>
      <div class="idee">${e(x.u)}</div>
    </div>`;
  }
  function zeichneUnterricht() {
    if (!window.TW_UNTERRICHT) return;
    const [a, b] = heutigeFaecher();
    $("k-unt").innerHTML = `<div class="zeichen" aria-hidden="true">${b === "MATHE" ? "π" : "λ"}</div>
      <h2>Für den Unterricht<small>Überschrift anklicken: Beamer-Modus</small></h2>
      ${faktHTML(a)}${faktHTML(b)}`;
  }

  /* Beamer-Modus: ein Fakt bildschirmfüllend, mit Pfeiltasten blättern */
  let beamerFach = null;
  function zeigeBeamer(fach) {
    beamerFach = fach;
    const x = waehleFakt(fach);
    let el = $("beamer");
    if (!el) {
      el = document.createElement("div"); el.id = "beamer"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
      document.body.appendChild(el);
    }
    el.innerHTML = `
      <div class="beamer-kopf"><span><b>${FAECHER[fach]}</b> Klasse ${e(x.k)}, ${e(x.th)}</span>
        <span class="beamer-knoepfe"><button data-b="zurueck" aria-label="Vorheriger Fakt">←</button><button data-b="vor" aria-label="Nächster Fakt">→</button><button data-b="zu" aria-label="Schließen">Schließen</button></span></div>
      <h1>${e(x.t)}</h1>
      <p>${e(x.f)}</p>
      <div class="beamer-idee">${e(x.u)}</div>`;
    el.classList.add("an");
    if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {});
  }
  function schliesseBeamer() {
    const el = $("beamer"); if (el) el.classList.remove("an");
    beamerFach = null;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  function blaettern(schritt) { if (!beamerFach) return; verschiebung[beamerFach] += schritt; zeigeBeamer(beamerFach); zeichneUnterricht(); }

  document.addEventListener("click", ev => {
    const w = ev.target.closest(".weiter"); if (w) { verschiebung[w.dataset.fach]++; zeichneUnterricht(); return; }
    const g = ev.target.closest(".fakt-gross"); if (g) { zeigeBeamer(g.dataset.fach); return; }
    const b = ev.target.closest("[data-b]");
    if (b) { if (b.dataset.b === "zu") schliesseBeamer(); else blaettern(b.dataset.b === "vor" ? 1 : -1); }
  });
  document.addEventListener("keydown", ev => {
    if (!beamerFach) return;
    if (ev.key === "Escape") schliesseBeamer();
    if (ev.key === "ArrowRight" || ev.key === " ") { ev.preventDefault(); blaettern(1); }
    if (ev.key === "ArrowLeft") blaettern(-1);
  });
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && beamerFach) { const el = $("beamer"); if (el) el.classList.remove("an"); beamerFach = null; } });

  /* ---------- Rechts: Raumfahrt (tagsüber) und Himmel (abends) ---------- */
  let startZeit = null, startDaten = null, ort = null, sonne = null, himmelGeladen = false;

  function zeigeRaumbild(b) {
    const el = $("k-start");
    el.classList.add("mit-bild");
    let bild = el.querySelector(".raumbild");
    if (!bild) { bild = document.createElement("a"); bild.className = "raumbild"; bild.target = "_blank"; bild.rel = "noopener"; el.prepend(bild); }
    bild.href = b.link; bild.title = b.titel;
    bild.innerHTML = `<img src="${e(b.bild)}" alt=""><span class="bildtitel">${e(b.quelle)}: ${e(b.titel)}</span>`;
  }

  function istAbend() {
    if (!sonne) return false;
    const jetzt = new Date(), heute = TW.isoTag(jetzt);
    const unter = new Date(`${heute}T${sonne.unter}:00`);
    return jetzt >= unter || jetzt.getHours() < 5;
  }

  function startHTML(s, kurz) {
    const wann = new Date(s.zeit).toLocaleString("de-DE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    if (kurz) return `<div class="start-kurz">Nächster Raketenstart: <a href="${e(s.link)}" target="_blank" rel="noopener">${e(s.name)}</a>, ${e(wann)} Uhr</div>`;
    return `<h2>Nächster Raketenstart <small>${e(wann)} Uhr</small></h2>
      <a href="${e(s.link)}" target="_blank" rel="noopener"><div class="mission titel">${s.crew ? "Mit Crew: " : ""}${e(s.name)}</div></a>
      <div class="meta">${s.unbekannt ? "Nutzlast nicht veröffentlicht" : e(s.rakete)}, ${e(s.anbieter)}, ${e(s.ort)}</div>
      <div class="countdown zahl" id="countdown"></div>`;
  }

  /* Welche Planeten sind heute Abend zu sehen? (Astronomy Engine) */
  const PLANETEN = { Mercury: "Merkur", Venus: "Venus", Mars: "Mars", Jupiter: "Jupiter", Saturn: "Saturn" };
  const RICHTUNG = ["Norden", "Nordosten", "Osten", "Südosten", "Süden", "Südwesten", "Westen", "Nordwesten"];
  function himmelHTML() {
    const A = window.Astronomy;
    if (!A || !ort) return null;
    const beobachter = new A.Observer(ort.lat, ort.lon, 300);
    // Zeitpunkt: jetzt, aber frühestens eine Stunde nach Sonnenuntergang (dann ist es dunkel genug)
    let zeit = new Date();
    if (sonne) { const dunkel = new Date(`${TW.isoTag(zeit)}T${sonne.unter}:00`); dunkel.setMinutes(dunkel.getMinutes() + 60); if (zeit < dunkel && zeit.getHours() >= 5) zeit = dunkel; }
    const lage = (koerper) => { const eq = A.Equator(koerper, zeit, beobachter, true, true); return A.Horizon(zeit, beobachter, eq.ra, eq.dec, "normal"); };
    const sichtbar = Object.keys(PLANETEN).map(p => {
      const h = lage(p), hell = A.Illumination(p, zeit).mag;
      return { name: PLANETEN[p], hoehe: h.altitude, richtung: RICHTUNG[Math.round(h.azimuth / 45) % 8], hell };
    }).filter(p => p.hoehe > 8).sort((a, b) => a.hell - b.hell);
    const uhr = TW.uhrzeit(zeit);
    const zeilen = sichtbar.length
      ? sichtbar.map(p => `<li><b>${p.name}</b><span>im ${p.richtung}, ${Math.round(p.hoehe)}° hoch${p.hell < -1.5 ? ", sehr hell" : p.hell < 1 ? ", gut sichtbar" : ""}</span></li>`).join("")
      : `<li><span>Gerade steht kein Planet gut sichtbar am Himmel.</span></li>`;
    return `<h2>Heute am Himmel <small>um ${uhr} Uhr</small></h2><ul class="himmel">${zeilen}</ul>`;
  }

  function zeichneRaum() {
    const el = $("k-start");
    const bild = el.querySelector(".raumbild");
    const inhalt = document.createElement("div"); inhalt.className = "raum-inhalt";
    const himmel = istAbend() ? himmelHTML() : null;
    if (himmel) inhalt.innerHTML = himmel + (startDaten ? startHTML(startDaten, true) : "");
    else if (startDaten) inhalt.innerHTML = startHTML(startDaten, false);
    else inhalt.innerHTML = `<h2>Raumfahrt</h2><p class="hinweis">Startkalender gerade nicht erreichbar.</p>`;
    el.innerHTML = ""; if (bild) el.appendChild(bild); el.appendChild(inhalt);
    tickStart();
  }

  function ladeHimmel() {
    if (himmelGeladen) return; himmelGeladen = true;
    const sk = document.createElement("script");
    sk.src = "https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js";
    sk.onload = zeichneRaum;
    document.head.appendChild(sk);
  }

  function zeichneStart(s) { startZeit = Date.parse(s.zeit); startDaten = s; zeichneRaum(); }
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
    Q.start().then(zeichneStart).catch(() => zeichneRaum());
    Q.heute().then(zeichneHeute).catch(() => { $("heute").innerHTML = ""; });
    Q.ferien().then(f => { $("ferien").innerHTML = ferienText(f); }).catch(() => {});
    Q.ort().then(async o => {
      ort = o;
      try {
        const w = await Q.wetter(o);
        sonne = w; ladeHimmel(); zeichneRaum();
        $("wetter").innerHTML = `${w.temp}°, ${e(TW.wetter(w.code))}<br><small>${o.name ? e(o.name) + ", " : ""}${w.min}° bis ${w.max}°</small>`;
        const tl = Math.round(w.tageslaenge / 60);
        $("sonne").innerHTML = `${w.auf} bis ${w.unter}<br><small>${Math.floor(tl / 60)} h ${tl % 60} min Tageslicht</small>`;
      } catch (_) {}
    });
  }

  ladeAlles();
  setInterval(() => { datumUndUhr(); tickStart(); }, 1000);
  setInterval(ladeNachrichten, C.AKTUALISIEREN_MINUTEN * 60000);
  setInterval(() => { if (istAbend()) zeichneRaum(); }, 10 * 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) ladeNachrichten(); });
  let warte; addEventListener("resize", () => { clearTimeout(warte); warte = setTimeout(() => letzteDaten && zeichneNachrichten(letzteDaten), 200); });

  const mitternacht = new Date(); mitternacht.setHours(24, 0, 30, 0);
  setTimeout(() => location.reload(), mitternacht - Date.now());
})();
