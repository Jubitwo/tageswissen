# Tageswissen

Persönliche Startseite für den Tag – schwarz-weiß, im Apple-Stil, optimiert für MacBook-Bildschirme
(alles auf einen Blick, ohne Scrollen). Alle Inhalte werden beim Öffnen **live** abgerufen.

**Live:** https://jubitwo.github.io/tageswissen/

## Inhalte und Quellen

| Bereich | Quelle (live) |
|---|---|
| Eilmeldungen & Top-Thema | tagesschau.de (ARD) – über den Worker |
| Schlagzeilen | ZDFheute, Deutschlandfunk, DW, SPIEGEL, ZEIT, FAZ, SZ, BBC, Guardian – über den Worker, **ohne Sport** |
| Wissenschaft | tagesschau Wissen, DLF Wissen, Spektrum, SPIEGEL Wissen, Nature, ScienceDaily, phys.org, NASA, BBC Science – über den Worker |
| Weltraum | nächster Raketenstart + Raumfahrt-Meldungen aus den Wissenschaftsquellen |
| Raketenstarts | Launch Library 2 (The Space Devs) |
| Heute vor … Jahren | Wikipedia (deutsch), bevorzugt Wissenschaft & Raumfahrt |
| Wetter, Sonne, Tageslänge | Open-Meteo |
| Schulferien & Feiertage | OpenHolidays API (Bundesland in `js/config.js`) |
| Mondphase | wird auf der Seite selbst berechnet (Kopfzeile) |
| Für den Unterricht | kuratierte Mathe- und Physik-Fakten mit Unterrichtsidee, Klasse 5–10 (`js/unterricht.js`), jeden Schultag ein neuer |

Die Seite aktualisiert die Nachrichten alle 5 Minuten und beim Zurückwechseln in den Tab.

## Aufbau

```
index.html
css/style.css
js/config.js       ← persönliche Einstellungen (Worker-Adresse, Ort, Bundesland)
js/werkzeuge.js    ← Hilfsfunktionen (Zeit, Mond, Wetter-Codes)
js/quellen.js      ← alle Live-Abrufe
js/unterricht.js   ← Mathe- und Physik-Fakten für den Unterricht (zum Ergänzen)
js/app.js          ← Aufbau der Seite
worker/            ← Cloudflare Worker für Nachrichten + Anleitung
```

## Einrichten

1. Worker einrichten: `worker/ANLEITUNG-WORKER.md`
2. Worker-Adresse in `js/config.js` eintragen.
3. GitHub Pages: *Settings → Pages → Branch `main`, Ordner `/ (root)`*.
