# Nachrichtendienst einrichten (Cloudflare Worker)

Eine GitHub-Seite darf die meisten Nachrichtenseiten aus Sicherheitsgründen nicht direkt abfragen.
Der Worker übernimmt das: Er holt bei jedem Öffnen der Seite live die Meldungen und gibt sie an
Tageswissen weiter. Kostenlos (Cloudflare erlaubt 100 000 Aufrufe pro Tag).

## Einmalig einrichten (ca. 5 Minuten)

1. Auf **dash.cloudflare.com** anmelden.
2. Links **Workers & Pages** → **Erstellen** → **Worker erstellen**.
3. Name: `tageswissen` → **Bereitstellen** (es entsteht zunächst „Hello World“).
4. **Code bearbeiten** klicken, den gesamten Inhalt löschen und den kompletten Inhalt von
   `worker/tageswissen-worker.js` einfügen → **Bereitstellen**.
5. Die Adresse des Workers kopieren, z. B. `https://tageswissen.DEINNAME.workers.dev`.
   Zum Testen im Browser öffnen: Es erscheint Text im JSON-Format mit `"schlagzeilen"` und `"quellen"`.
   Unter `"quellen"` siehst du für jede Quelle `ok` oder eine Fehlermeldung.
6. In `js/config.js` die Adresse bei `WORKER_URL` eintragen, speichern, committen und pushen.

## Quellen ändern

Die Listen `NACHRICHTEN` und `WISSENSCHAFT` oben in `tageswissen-worker.js` enthalten alle Feeds.
Einträge hinzufügen oder entfernen, danach den Worker erneut bereitstellen.

## Hinweise

- Ergebnisse werden 3 Minuten zwischengespeichert. Die Tagesschau erlaubt höchstens 60 Abrufe pro Stunde;
  so bleibt der Worker sicher darunter.
- `?frisch` an die Worker-Adresse anhängen umgeht den Zwischenspeicher (nur zum Testen).
- Die Inhalte gehören den jeweiligen Medien. Tageswissen zeigt nur Überschriften und kurze Anrisse
  und verlinkt immer auf den Originalartikel. Die Tagesschau-Inhalte sind nur für den privaten Gebrauch freigegeben.
