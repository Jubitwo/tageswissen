# Projektregeln für Tageswissen

- Reines HTML/CSS/JavaScript ohne Frameworks und ohne Build-Schritt. Läuft direkt über GitHub Pages.
- Design: ausschließlich Schwarz, Weiß und Grautöne (Apple-Stil, Systemschrift). Keine Farbakzente.
  Bilder werden schwarz-weiß gezeigt und erst beim Darüberfahren farbig.
- Die Seite muss auf MacBook-Bildschirmen (ab 1280 × 720 sichtbarer Fläche) **ohne Scrollen** vollständig
  sichtbar sein. Nach jeder Änderung bei 1280 × 720, 1440 × 780 und 1470 × 830 prüfen.
- Keine fest hinterlegten Fakten oder Nachrichten. Alle Inhalte kommen live aus den Quellen in `js/quellen.js`
  oder aus dem Worker (`worker/tageswissen-worker.js`). Fällt eine Quelle aus, zeigt nur diese Kachel einen
  kurzen Hinweis – der Rest der Seite läuft weiter.
- Einzige Ausnahme: `js/unterricht.js` enthält bewusst kuratierte Mathe- und Physik-Fakten für den Unterricht
  (Klasse 5–10, Bildungsplan BW). Neue Einträge im gleichen Format ergänzen, fachlich korrekt und mit Unterrichtsidee.
- Aufbau bewusst schlicht: drei Spalten (links der Tag mit Uhr und Mond, Mitte Top-Thema + Wissenschaft + Nachrichten, rechts Unterricht + Raketenstart). Kein Laufband, keine Kachel-Flut. Neue Elemente nur, wenn dafür ein anderes wegfällt.
- Schriften: Überschriften in der Serifenschrift (New York), alles andere in SF Pro. Beschriftungen in normaler Schreibweise, nicht in Großbuchstaben.
- Persönliche Einstellungen gehören nur in `js/config.js`.
- Texte auf der Seite sind deutsch; englische Überschriften aus internationalen Quellen bleiben im Original.
- Jede Meldung verlinkt auf den Originalartikel und nennt die Quelle.
- Code-Kommentare und Bezeichner auf Deutsch, wie im bestehenden Code.
