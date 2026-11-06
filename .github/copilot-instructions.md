# Projektregeln für Tageswissen

- Reines HTML/CSS/JavaScript ohne Frameworks und ohne Build-Schritt. Läuft direkt über GitHub Pages.
- Design: ausschließlich Schwarz, Weiß und Grautöne (Apple-Stil, Systemschrift). Keine Farbakzente.
  Bilder werden schwarz-weiß gezeigt und erst beim Darüberfahren farbig.
- Die Seite muss auf MacBook-Bildschirmen (ab 1280 × 720 sichtbarer Fläche) **ohne Scrollen** vollständig
  sichtbar sein. Nach jeder Änderung bei 1280 × 720, 1440 × 780 und 1470 × 830 prüfen.
- Keine fest hinterlegten Fakten oder Nachrichten. Alle Inhalte kommen live aus den Quellen in `js/quellen.js`
  oder aus dem Worker (`worker/tageswissen-worker.js`). Fällt eine Quelle aus, zeigt nur diese Kachel einen
  kurzen Hinweis – der Rest der Seite läuft weiter.
- Persönliche Einstellungen gehören nur in `js/config.js`.
- Texte auf der Seite sind deutsch; englische Überschriften aus internationalen Quellen bleiben im Original.
- Jede Meldung verlinkt auf den Originalartikel und nennt die Quelle.
- Code-Kommentare und Bezeichner auf Deutsch, wie im bestehenden Code.
