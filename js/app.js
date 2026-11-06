/* Tageswissen – Aufbau der Seite */
(() => {
  const C = window.TW_CONFIG, Q = window.TW_QUELLEN, $ = id => document.getElementById(id), e = TW.esc;
  const info = {};          // Bausteine der Kopfzeile
  let letzteDaten = null;   // letzte Nachrichten (für Neuaufbau bei Größenänderung)

  /* Sport wird auch hier ausgefiltert – falls der Worker noch eine ältere Version ist */
  const SPORT_ADRESSE = /\/sport|\/fussball|\/football|sportschau|kicker\.de|\/bundesliga/i;
  const SPORT_WORT = /(bundesliga|fu(ß|ss)ball|eishockey|handball|basketball|volleyball|tennis|formel[ -]?1|champions[- ]league|europa league|\bdfb\b|\bfifa\b|\buefa\b|olympi|biathlon|skispring|leichtathletik|torwart|elfmeter|premier league|\bnba\b|\bnfl\b|wimbledon|tour de france|nationalmannschaft|bayern münchen|\bbvb\b|borussia|schalke|\bvfb\b|rb leipzig|werder|\bfc [a-zäöü]|\bwm-|-wm\b|-em\b|weltcup)/i;
  const keinSport = i => !(SPORT_ADRESSE.test(i.link || "") || SPORT_WORT.test((i.titel || "") + " " + (i.dachzeile || "")));


  /* ---------- Kopfzeile ---------- */
  function datumUndUhr() {
    const d = new Date();
    $("uhr").textContent = TW.uhrzeit(d);
    $("datum").textContent = `${TW.TAGE[d.getDay()]}, ${d.getDate()}. ${TW.MONATE[d.getMonth()]} ${d.getFullYear()} · KW ${TW.kw(d)}`;
  }

  function zeichneTagesinfo() {
    const teile = [];
    if (info.wetter) {
      const w = info.wetter;
      teile.push(`<span class="chip"><b>${w.temp}°</b> ${e(TW.wetter(w.code))}${info.ortName ? " · " + e(info.ortName) : ""} <span>${w.min}° / ${w.max}°</span></span>`);
      teile.push(`<span class="chip">Sonne <b>${w.auf}</b> – <b>${w.unter}</b></span>`);
    }
    const m = TW.mond();
    teile.push(`<span class="chip">${TW.mondSVG(m.p, 14)} ${e(m.name)} <b>${m.licht} %</b></span>`);
    if (info.ferien) teile.push(`<span class="chip">${info.ferien}</span>`);
    $("tagesinfo").innerHTML = teile.join("");
  }

  function ferienText(f) {
    const heute = TW.isoTag(new Date());
    const fei = f.feiertage.find(x => x.von <= heute && x.bis >= heute);
    if (fei) return `Heute: <b>${e(fei.name)}</b>`;
    const jetzt = f.schule.find(x => x.von <= heute && x.bis >= heute);
    if (jetzt) {
      const rest = Math.round((new Date(jetzt.bis) - new Date(heute)) / 864e5);
      return `<b>${e(jetzt.name)}</b> · noch ${rest} ${rest === 1 ? "Tag" : "Tage"}`;
    }
    const naechste = f.schule.filter(x => x.von > heute && /ferien/i.test(x.name)).sort((a, b) => a.von.localeCompare(b.von))[0];
    if (!naechste) return "";
    const tage = Math.round((new Date(naechste.von) - new Date(heute)) / 864e5);
    return `Noch <b>${tage} Tage</b> bis ${e(naechste.name)}`;
  }

  /* ---------- Nachrichten ---------- */
  function zeichneNachrichten(roh) {
    letzteDaten = roh;
    const d = {
      ...roh,
      eilmeldungen: (roh.eilmeldungen || []).filter(keinSport),
      top: (roh.top || []).filter(keinSport),
      schlagzeilen: (roh.schlagzeilen || []).filter(keinSport),
      wissenschaft: (roh.wissenschaft || []).filter(keinSport)
    };

    // Eilmeldung
    const eil = d.eilmeldungen[0];
    const eilEl = $("eil");
    if (eil) {
      eilEl.classList.add("an");
      eilEl.href = eil.link;
      $("eil-titel").textContent = (eil.dachzeile ? eil.dachzeile + ": " : "") + eil.titel;
      $("eil-wann").textContent = TW.relZeit(eil.zeit) + " · tagesschau";
    } else eilEl.classList.remove("an");

    // Top-Thema
    const top = d.top.filter(t => !t.eil);
    const haupt = top.find(t => t.bild) || top[0];
    if (haupt) {
      const weitere = top.filter(t => t !== haupt).slice(0, 3);
      $("k-top").innerHTML = `
        <a class="buehne" href="${e(haupt.link)}" target="_blank" rel="noopener">
          ${haupt.bild ? `<img class="sw" src="${e(haupt.bild)}" alt="">` : ""}
          <div class="verlauf"></div>
          <div class="inhalt">
            <div class="label hell">Top-Thema <span class="rechts">tagesschau · ${e(TW.relZeit(haupt.zeit))}</span></div>
            ${haupt.dachzeile ? `<div class="dach">${e(haupt.dachzeile)}</div>` : ""}
            <h1 class="titel">${e(haupt.titel)}</h1>
            <p class="anriss">${e(haupt.text)}</p>
          </div>
        </a>
        <div class="weitere">${weitere.map(w => `
          <a href="${e(w.link)}" target="_blank" rel="noopener">
            <div class="quelle">${e(w.dachzeile || "tagesschau")}<i>${e(TW.relZeit(w.zeit))}</i></div>
            <div class="titel">${e(w.titel)}</div>
          </a>`).join("")}</div>`;
    } else {
      $("k-top").innerHTML = `<div style="padding:24px" class="hinweis">Die Tagesschau ist gerade nicht erreichbar.</div>`;
    }

    const wiss = d.wissenschaft;

    // Wissenschaft (Schwerpunkt der Seite)
    if (wiss.length) {
      $("k-wiss").innerHTML = `<div class="label">Wissenschaft <span class="rechts">${anzahlQuellen(wiss)} Quellen</span></div>
        <div class="liste">${ausgewogen(wiss, 2).slice(0, 6).map(x => eintrag(x, true)).join("")}</div>`;
    } else {
      $("k-wiss").innerHTML = `<div class="label">Wissenschaft</div>${d.ohneWorker ? hinweisWorker() : `<p class="hinweis">Gerade keine Meldungen erreichbar.</p>`}`;
    }

    // Schlagzeilen – ausgewogen: höchstens 2 je Quelle nacheinander
    const schlag = ausgewogen(d.schlagzeilen, 2);
    if (schlag.length) {
      $("k-news").innerHTML = `<div class="label">Schlagzeilen <span class="rechts">${anzahlQuellen(schlag)} Quellen · ohne Sport</span></div>
        <div class="liste">${schlag.slice(0, 4).map(x => eintrag(x)).join("")}</div>`;
    } else {
      $("k-news").innerHTML = `<div class="label">Schlagzeilen</div>${d.ohneWorker ? hinweisWorker() : `<p class="hinweis">Gerade keine Meldungen erreichbar.</p>`}`;
    }

    const ok = Object.values(d.quellen || {}).filter(v => v === "ok").length;
    const alle = Object.keys(d.quellen || {}).length;
    $("stand").textContent = `Stand ${TW.uhrzeit(new Date(d.erstellt || Date.now()))}` + (alle ? ` · ${ok}/${alle} Quellen` : "");
    $("stand").title = Object.entries(d.quellen || {}).map(([k, v]) => `${k}: ${v}`).join("\n");

    passeAn();
  }

  /* Nicht mehr als n Meldungen pro Quelle vorne, der Rest danach */
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
  const hinweisWorker = () => `<p class="hinweis"><b>Nachrichtendienst noch nicht verbunden.</b><br>Trage die Worker-Adresse in <code>js/config.js</code> ein – siehe <code>worker/ANLEITUNG-WORKER.md</code>.</p>`;

  function passeAn() { document.querySelectorAll(".liste").forEach(TW.passend); }

  /* ---------- Weltraum: Raketenstart + Raumfahrt-Meldungen ---------- */
  let startZeit = null;
  function zeichneStart(s) {
    startZeit = Date.parse(s.zeit);
    $("k-raum").innerHTML = `
      <div class="label">Nächster Raketenstart <span class="rechts">${e(new Date(s.zeit).toLocaleString("de-DE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))}</span></div>
      <a class="mission titel" href="${e(s.link)}" target="_blank" rel="noopener">${e(s.name)}</a>
      <div class="meta">${s.unbekannt ? "Nutzlast nicht veröffentlicht" : e(s.rakete)} · ${e(s.anbieter)}<br>${e(s.ort)}</div>
      <div class="countdown zahl" id="countdown"></div>`;
    tickStart();
  }
  function tickStart() {
    const el = $("countdown"); if (!el || !startZeit) return;
    let s = Math.round((startZeit - Date.now()) / 1000);
    const vorbei = s < 0; s = Math.abs(s);
    const t = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sek = s % 60;
    const z = TW.zweistellig;
    el.innerHTML = `<div><b>${vorbei ? "T+" : "T−"}</b><span>&nbsp;</span></div>` +
      (t ? `<div><b>${t}</b><span>${t === 1 ? "Tag" : "Tage"}</span></div>` : "") +
      `<div><b>${z(h)}</b><span>Std.</span></div><div><b>${z(m)}</b><span>Min.</span></div><div><b>${z(sek)}</b><span>Sek.</span></div>`;
  }
  /* ---------- Heute vor … Jahren ---------- */
  function zeichneHeute(h) {
    const jahre = new Date().getFullYear() - h.jahr;
    $("k-heute").innerHTML = `
      <div class="label">Heute vor … Jahren <span class="rechts">Wikipedia</span></div>
      <div class="jahre zahl">${jahre}<small>Jahren · ${h.jahr}</small></div>
      <p>${e(h.text)}</p>
      <a class="mehr" href="${e(h.link)}" target="_blank" rel="noopener">Weiterlesen auf Wikipedia →</a>`;
  }

  /* ---------- Für den Unterricht (kuratiert, ein Eintrag pro Schultag) ---------- */
  function schultagNr() {
    const U = window.TW_UNTERRICHT;
    const start = new Date(U.START + "T12:00:00"), heute = new Date(); heute.setHours(12, 0, 0, 0);
    let n = 0;
    for (let d = new Date(start); d <= heute; d.setDate(d.getDate() + 1)) {
      const w = d.getDay(); if (w !== 0 && w !== 6) n++;
    }
    return Math.max(0, n - 1); // am Wochenende bleibt der Freitag stehen
  }
  const verschiebung = { MATHE: 0, PHYSIK: 0 };
  function waehleFakt(fach) {
    const liste = window.TW_UNTERRICHT[fach];
    const i = schultagNr() + verschiebung[fach];
    // Klassenstufen gemischt: Schrittweite 37 ist teilerfremd zur Listenlänge
    return liste[((i * 37) % liste.length + liste.length) % liste.length];
  }
  function faktHTML(fach, name) {
    const x = waehleFakt(fach);
    return `<div class="fakt">
      <div class="quelle">${name} · Klasse ${e(x.k)}<i>${e(x.th)}</i><button class="weiter" data-fach="${fach}" title="Anderer Fakt" aria-label="Anderer Fakt">↻</button></div>
      <div class="fakt-titel">${e(x.t)}</div>
      <p>${e(x.f)}</p>
      <div class="idee"><b>Im Unterricht:</b> ${e(x.u)}</div>
    </div>`;
  }
  function zeichneUnterricht() {
    if (!window.TW_UNTERRICHT) return;
    $("k-unt").innerHTML = `<div class="label">Für den Unterricht <span class="rechts">Klasse 5–10</span></div>
      ${faktHTML("MATHE", "Mathematik")}${faktHTML("PHYSIK", "Physik")}`;
  }
  document.addEventListener("click", ev => {
    const b = ev.target.closest(".weiter"); if (!b) return;
    verschiebung[b.dataset.fach]++; zeichneUnterricht();
  });

  const fehler = (id, label, text) => { $(id).innerHTML = `<div class="label">${label}</div><p class="hinweis">${text}</p>`; };

  /* ---------- Laden ---------- */
  async function ladeNachrichten() {
    try { zeichneNachrichten(await Q.nachrichten()); }
    catch (err) {
      zeichneNachrichten({ eilmeldungen: [], top: [], schlagzeilen: [], wissenschaft: [], ohneWorker: !C.WORKER_URL });
      $("stand").textContent = "Nachrichten nicht erreichbar";
    }
  }

  function ladeAlles() {
    datumUndUhr(); zeichneTagesinfo(); zeichneUnterricht();
    ladeNachrichten();
    Q.start().then(zeichneStart).catch(() => fehler("k-raum", "Nächster Raketenstart", "Startkalender gerade nicht erreichbar."));
    Q.heute().then(zeichneHeute).catch(() => fehler("k-heute", "Heute vor … Jahren", "Wikipedia gerade nicht erreichbar."));
    Q.ferien().then(f => { info.ferien = ferienText(f); zeichneTagesinfo(); }).catch(() => {});
    Q.ort().then(async ort => {
      info.ortName = ort.name;
      try { info.wetter = await Q.wetter(ort); } catch (_) {}
      zeichneTagesinfo();
    });
  }

  ladeAlles();
  setInterval(() => { datumUndUhr(); tickStart(); }, 1000);
  setInterval(ladeNachrichten, C.AKTUALISIEREN_MINUTEN * 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) ladeNachrichten(); });
  let warte; addEventListener("resize", () => { clearTimeout(warte); warte = setTimeout(() => letzteDaten && zeichneNachrichten(letzteDaten), 200); });

  // Um Mitternacht neu laden (neuer Tag, neue Inhalte)
  const mitternacht = new Date(); mitternacht.setHours(24, 0, 30, 0);
  setTimeout(() => location.reload(), mitternacht - Date.now());
})();
