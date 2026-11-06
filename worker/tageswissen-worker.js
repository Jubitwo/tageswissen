/**
 * Tageswissen – Nachrichtendienst (Cloudflare Worker)
 *
 * Holt bei jedem Aufruf live die Meldungen der großen Medien und Wissenschaftsquellen,
 * vereinheitlicht sie und gibt sie als JSON an die Tageswissen-Seite zurück.
 * Ergebnisse werden 3 Minuten zwischengespeichert (schont die Quellen;
 * die Tagesschau erlaubt höchstens 60 Abrufe pro Stunde).
 *
 * Einrichten: siehe worker/ANLEITUNG-WORKER.md
 */

const CACHE_SEKUNDEN = 180;
const TIMEOUT_MS = 6000;

const NACHRICHTEN = [
  { name: "ZDFheute",       url: "https://www.zdf.de/rss/zdf/nachrichten" },
  { name: "Deutschlandfunk",url: "https://www.deutschlandfunk.de/nachrichten-100.rss" },
  { name: "SPIEGEL",        url: "https://www.spiegel.de/schlagzeilen/index.rss" },
  { name: "ZEIT",           url: "https://newsfeed.zeit.de/index" },
  { name: "FAZ",            url: "https://www.faz.net/rss/aktuell/" },
  { name: "SZ",             url: "https://rss.sueddeutsche.de/rss/Topthemen" },
  { name: "DW",             url: "https://rss.dw.com/rdf/rss-de-all" },
  { name: "BBC",            url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { name: "Guardian",       url: "https://www.theguardian.com/world/rss" }
];

const WISSENSCHAFT = [
  { name: "tagesschau Wissen", url: "https://www.tagesschau.de/wissen/index~rss2.xml" },
  { name: "DLF Wissen",        url: "https://www.deutschlandfunk.de/wissen-106.rss" },
  { name: "Spektrum",          url: "https://www.spektrum.de/alias/rss/spektrum-de-rss-feed/996406" },
  { name: "SPIEGEL Wissen",    url: "https://www.spiegel.de/wissenschaft/index.rss" },
  { name: "Nature",            url: "https://www.nature.com/nature.rss" },
  { name: "ScienceDaily",      url: "https://www.sciencedaily.com/rss/top/science.xml" },
  { name: "phys.org",          url: "https://phys.org/rss-feed/" },
  { name: "NASA",              url: "https://www.nasa.gov/news-release/feed/" },
  { name: "BBC Science",       url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml" }
];

/* Sport wird komplett ausgefiltert (Adresse und Stichwörter) */
const SPORT_ADRESSE = /\/sport|\/fussball|\/football|sportschau|kicker\.de|\/bundesliga/i;
const SPORT_WORT = /(bundesliga|fu(ß|ss)ball|eishockey|handball|basketball|volleyball|tennis|formel[ -]?1|champions[- ]league|europa league|conference league|\bdfb\b|\bdfl\b|\bfifa\b|\buefa\b|olympi|biathlon|skispring|ski alpin|leichtathletik|torwart|elfmeter|premier league|\bnba\b|\bnfl\b|\bnhl\b|wimbledon|tour de france|nationalmannschaft|bayern münchen|\bbvb\b|borussia|schalke|\bvfb\b|\bvfl\b|rb leipzig|werder|eintracht frankfurt|\b1\. fc\b|\bfc [a-zäöü]|grand slam|\bwm-|\bem-|-wm\b|-em\b|dfb-pokal|weltcup)/i;
const istSport = i => SPORT_ADRESSE.test(i.link || "") || SPORT_WORT.test((i.titel || "") + " " + (i.dachzeile || ""));

/* dpa-Kurzmeldungen der ZEIT (zeit.de/news/…) sind sehr kleinteilig – weglassen */
const ZU_KLEINTEILIG = /zeit\.de\/news\//i;

/* Weltraumbild: Astronomy Picture of the Day (Feed), sonst NASA Image of the Day */
const BILDQUELLEN = [
  { name: "NASA Bild des Tages", url: "https://www.nasa.gov/feeds/iotd-feed/" },
  { name: "NASA APOD",          url: "https://science.nasa.gov/feed/apod-basic/" }
];

/* Wörter, die beim Erkennen gemeinsamer Themen nicht zählen */
const FUELLWOERTER = new Set(("der die das den dem des ein eine einer eines einem einen und oder aber nicht nach vor bei mit von vom zum zur für fuer auf aus über ueber unter gegen wegen durch noch auch schon wie was wer wird werden wurde soll sollen will wollen kann koennen hat haben ist sind war mehr neue neuer neues erste ersten zwei drei jahr jahre heute gestern morgen live ticker liveblog news newsblog dpa sich ihre ihren seine seinen dass doch nur alle beim ohne viele sagt sagen laut bericht berichte medienberichte the and for with from that this after over into about says said new will has have are was were not more than his her their they what when how why who".split(" ")));
const TAGESSCHAU_API = "https://www.tagesschau.de/api2u/homepage/";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const cache = caches.default;
    const schluessel = new Request(new URL("/tageswissen-v3", request.url).toString());
    const frisch = new URL(request.url).searchParams.has("frisch");
    if (!frisch) {
      const treffer = await cache.match(schluessel);
      if (treffer) return treffer;
    }

    const status = {};
    const [ts, nachrichten, wissenschaft, bilder] = await Promise.all([
      holeTagesschau(status),
      holeGruppe(NACHRICHTEN, status, 12),
      holeGruppe(WISSENSCHAFT, status, 4),
      holeGruppe(BILDQUELLEN, status, 3)
    ]);

    const daten = {
      erstellt: new Date().toISOString(),
      eilmeldungen: ts.eil,
      top: ts.top,
      themen: themen([ts.top, ...nachrichten]),
      schlagzeilen: mische(nachrichten.map(g => g.slice(0, 4)), 40),
      raumbild: (bilder.flat().find(b => b.bild) || null),
      raumbilder: bilder.flat().filter(b => b.bild).slice(0, 4),
      wissenschaft: mische(wissenschaft, 30),
      quellen: status
    };

    const antwort = new Response(JSON.stringify(daten), {
      headers: { ...CORS, "Cache-Control": `public, max-age=${CACHE_SEKUNDEN}` }
    });
    ctx.waitUntil(cache.put(schluessel, antwort.clone()));
    return antwort;
  }
};

/* ---------- Abruf ---------- */

async function hole(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Tageswissen/1.0 (persoenliche Startseite)", "Accept": "*/*" },
      cf: { cacheTtl: 60 }
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r;
  } finally {
    clearTimeout(t);
  }
}

async function holeTagesschau(status) {
  try {
    const j = await (await hole(TAGESSCHAU_API)).json();
    const alle = [...(j.news || []), ...(j.regional || [])].filter(n => n && n.title && n.ressort !== "sport");
    const umwandeln = n => ({
      quelle: "tagesschau",
      titel: n.title,
      dachzeile: n.topline || "",
      text: n.firstSentence || "",
      link: n.shareURL || n.detailsweb || "https://www.tagesschau.de",
      zeit: n.date || null,
      bild: bildVariante(n.teaserImage),
      eil: !!n.breakingNews
    });
    const liste = alle.map(umwandeln).filter(n => !istSport(n));
    status.tagesschau = "ok";
    return { eil: liste.filter(n => n.eil), top: liste.slice(0, 8) };
  } catch (e) {
    status.tagesschau = "Fehler: " + e.message;
    return { eil: [], top: [] };
  }
}

function bildVariante(ti) {
  const v = ti && ti.imageVariants;
  if (!v) return null;
  return v["16x9-960"] || v["16x9-1920"] || v["16x9-640"] || Object.values(v)[0] || null;
}

async function holeGruppe(quellen, status, jeQuelle) {
  const ergebnisse = await Promise.all(quellen.map(async q => {
    try {
      const text = await (await hole(q.url)).text();
      const items = parseFeed(text)
        .filter(i => !istSport(i) && !ZU_KLEINTEILIG.test(i.link))
        .slice(0, jeQuelle)
        .map(i => ({ ...i, quelle: q.name }));
      status[q.name] = items.length ? "ok" : "leer";
      return items;
    } catch (e) {
      status[q.name] = "Fehler: " + e.message;
      return [];
    }
  }));
  return ergebnisse;
}

/* Abwechselnd aus allen Quellen, dann nach Zeit sortiert */
function mische(gruppen, max) {
  const alle = gruppen.flat().filter(i => i.titel);
  const gesehen = new Set();
  const eindeutig = alle.filter(i => {
    const k = i.titel.toLowerCase().slice(0, 60);
    if (gesehen.has(k)) return false;
    gesehen.add(k);
    return true;
  });
  eindeutig.sort((a, b) => (Date.parse(b.zeit) || 0) - (Date.parse(a.zeit) || 0));
  return eindeutig.slice(0, max);
}

/* ---------- Das große Thema: worüber berichten viele Medien gleichzeitig? ---------- */
function stichworte(titel) {
  const woerter = titel.toLowerCase()
    .replace(/[äÄ]/g, "ae").replace(/[öÖ]/g, "oe").replace(/[üÜ]/g, "ue").replace(/ß/g, "ss")
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 4 && !FUELLWOERTER.has(w) && !/^\d+$/.test(w));
  return {
    kurz: new Set(woerter.map(w => w.slice(0, 6))),               // Wortstamm (Aigner/Aigners)
    lang: new Set(woerter.filter(w => w.length >= 10))             // lange, eindeutige Wörter
  };
}

function passt(m, h) {
  let gemeinsam = 0;
  for (const w of m.w.kurz) if (h.kurz.has(w)) gemeinsam++;
  for (const w of m.w.lang) if (h.lang.has(w)) gemeinsam += 2;     // ein langes gemeinsames Wort genügt
  return gemeinsam;
}

function themen(gruppen) {
  const alle = gruppen.flat().filter(i => i && i.titel)
    .map(i => ({ ...i, w: stichworte(i.titel + " " + (i.dachzeile || "")) }));
  let haufen = [];
  const einordnen = m => {
    let bester = null, besteZahl = 0;
    for (const h of haufen) { const z = passt(m, h); if (z > besteZahl) { besteZahl = z; bester = h; } }
    if (bester && besteZahl >= 2) {
      bester.meldungen.push(m);
      m.w.kurz.forEach(w => bester.kurz.add(w)); m.w.lang.forEach(w => bester.lang.add(w));
    } else haufen.push({ kurz: new Set(m.w.kurz), lang: new Set(m.w.lang), meldungen: [m] });
  };
  alle.forEach(einordnen);
  // Zweiter Durchgang: Einzelmeldungen noch einmal gegen die gewachsenen Themen prüfen
  const einzeln = haufen.filter(h => h.meldungen.length === 1).map(h => h.meldungen[0]);
  haufen = haufen.filter(h => h.meldungen.length > 1);
  einzeln.forEach(einordnen);

  const vorrang = ["tagesschau", "ZDFheute", "Deutschlandfunk", "DW", "SZ", "ZEIT", "FAZ", "SPIEGEL", "BBC", "Guardian"];
  return haufen
    .map(h => {
      const quellen = [...new Set(h.meldungen.map(m => m.quelle))];
      const vertreter = [...h.meldungen].sort((a, b) => vorrang.indexOf(a.quelle) - vorrang.indexOf(b.quelle))[0];
      const zeit = h.meldungen.map(m => Date.parse(m.zeit) || 0).reduce((a, b) => Math.max(a, b), 0);
      return {
        titel: vertreter.titel, link: vertreter.link, quelle: vertreter.quelle,
        dachzeile: vertreter.dachzeile || "", text: vertreter.text || "",
        zeit: zeit ? new Date(zeit).toISOString() : null,
        anzahl: quellen.length, quellen
      };
    })
    .sort((a, b) => b.anzahl - a.anzahl || (Date.parse(b.zeit) || 0) - (Date.parse(a.zeit) || 0))
    .slice(0, 12);
}

/* ---------- RSS / Atom / RDF ohne Bibliotheken ---------- */

function parseFeed(xml) {
  const bloecke = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map(m => m[0]);
  return bloecke.map(b => {
    const titel = text(feld(b, "title"));
    let link = text(feld(b, "link"));
    if (!link) {
      const m = b.match(/<link\b[^>]*href="([^"]+)"/i);
      if (m) link = m[1];
    }
    const zeit = text(feld(b, "pubDate") || feld(b, "updated") || feld(b, "published") || feld(b, "dc:date"));
    const beschr = text(feld(b, "description") || feld(b, "summary") || feld(b, "content"));
    const bild =
      (b.match(/<media:(?:content|thumbnail)\b[^>]*url="([^"]+)"/i) || [])[1] ||
      ((b.match(/<enclosure\b[^>]*>/i) || [""])[0].match(/url="([^"]+\.(?:jpe?g|png|webp|gif)[^"]*)"/i) || [])[1] ||
      (b.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').match(/<img\b[^>]*src="(https?:[^"]+\.(?:jpe?g|png|webp)[^"]*)"/i) || [])[1] ||
      null;
    return {
      titel,
      link: link || "",
      zeit: zeit && !isNaN(Date.parse(zeit)) ? new Date(zeit).toISOString() : null,
      text: kuerze(beschr, 220),
      bild
    };
  }).filter(i => i.titel);
}

function feld(block, name) {
  const re = new RegExp("<" + name.replace(":", "\\:") + "\\b[^>]*>([\\s\\S]*?)<\\/" + name.replace(":", "\\:") + ">", "i");
  const m = block.match(re);
  return m ? m[1] : "";
}

function text(s) {
  if (!s) return "";
  const entitaeten = t => t
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
  return entitaeten(
      entitaeten(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"))   // HTML in Beschreibungen ist oft maskiert
        .replace(/<[^>]+>/g, " ")
    )
    .replace(/\s+/g, " ")
    .trim();
}

function kuerze(s, n) {
  return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + " …" : s;
}
