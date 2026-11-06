# Anweisung für GitHub Copilot (Agent-Modus) – Tageswissen

Öffne den Ordner `~/Projects/Tageswissen` in VS Code und kopiere diesen Text als **erste Nachricht** in GitHub Copilot (Agent-Modus).

---

Du arbeitest im Ordner **~/Projects/Tageswissen**. Alle Dateien der Seite liegen bereits fertig darin.
Ändere keine Datei inhaltlich – es geht nur um das Veröffentlichen auf GitHub.

**Projektregeln:** Lies `.github/copilot-instructions.md` und halte dich bei allen späteren Änderungen daran.

**Schritt 1 – Repository anlegen und hochladen**
1. Prüfe, ob der Ordner schon ein Git-Repository ist. Wenn nicht: `git init -b main`.
2. Prüfe die `.gitignore`: Die Mac-Automatik-Dateien (`*.command`, `*.plist`, `tageswissen-oeffnen.sh`, `.zuletzt-geoeffnet`) dürfen **nicht** ins Repository.
3. Lege auf GitHub ein **öffentliches** Repository **tageswissen** für den Nutzer **Jubitwo** an (öffentlich ist für kostenloses GitHub Pages nötig) und verbinde es als `origin`. Falls du das Repository nicht selbst anlegen kannst, erkläre mir die Klicks auf github.com und warte.
4. Commit mit der Nachricht „Tageswissen: Live-Startseite (schwarz-weiß)“ und push auf `main`.

**Schritt 2 – GitHub Pages**
Erkläre mir, wie ich unter *Settings → Pages* (Branch `main`, Ordner `/ (root)`) GitHub Pages einschalte.
Die Seite ist danach unter https://jubitwo.github.io/tageswissen/ erreichbar.

**Schritt 3 – Nachrichtendienst**
Führe mich Schritt für Schritt durch `worker/ANLEITUNG-WORKER.md`. Wenn ich dir die Worker-Adresse nenne,
trage sie in `js/config.js` bei `WORKER_URL` ein, committe („Worker-Adresse eingetragen“) und pushe.

**Prüfe am Ende:** `index.html` lädt die Skripte in dieser Reihenfolge: config.js, werkzeuge.js, quellen.js, app.js.
