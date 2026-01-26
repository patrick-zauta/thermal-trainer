# Paragliding Thermal Trainer

## Start
```bash
npm install
npm run dev
```

## Screens
- Home mit kurzer Einfuehrung und Start
- Modus Auswahl fuer Training oder Free Flight
- Einstellungen fuer Audio, Vollbild und Tastenbelegung
- Spiel mit Pause Menue und Zusammenfassung nach Exit

## Steuerung Standard
- Bremse links ziehen: A
- Bremse links loesen: Q
- Bremse rechts ziehen: L
- Bremse rechts loesen: P
- Speedbar: Leertaste
- Pause: Esc
- Debug Overlay: D

## Hinweise
- Keybindings lassen sich in Einstellungen aendern.
- Restart ist nur ueber das Pause Menue moeglich.
- Touch Steuerung ist auf Mobile verfuegbar und kann in Einstellungen auf Auto, Ein oder Aus gesetzt werden.
- Turn Modell nutzt yaw, slip und bank fuer traegeres Kurvenverhalten, Vollkreis ca 13 Sekunden bei Trim.
- Wind kann in Einstellungen aktiviert werden, Richtung ist die Downwind Richtung in Grad.
- Thermik Drift kann optional aktiviert werden und folgt dem Wind mit Faktor.
- Zufallswind erzeugt bei aktivem Wind eine zufaellige Richtung und Staerke pro Run.
- Mehrere Karten mit Turnpoints und Zielbereich sind im Modus Auswahl verfuegbar.
- Bei 0 m Hoehe erscheint Game Over, bei Zielerreichung ein Winner Screen, danach die Uebersicht.
- Swisstopo Hintergrundkarte und AGL Anzeige sind integriert.
- Dieses Kartenfeature wurde fuer Patrick Zauta implementiert.
- Zufalls Modus erzeugt zufaellige Thermiken, Turnpoints und Ziel auf Knopfdruck.

## Karte und Datenquellen
- MapConfig befindet sich in `src/game/map/maps/ch_demo.ts` und kann fuer andere Gebiete angepasst werden.
- WMTS Layer: `ch.swisstopo.pixelkarte-grau` oder `ch.swisstopo.pixelkarte-farbe`.
- Hoehenabfrage via `https://api3.geo.admin.ch/rest/services/height`.

## Mobile Steuerung
- Linker Slider: Bremse links
- Rechter Slider: Bremse rechts
- Speedbar Button: halten zum Beschleunigen
- Pause Button oben rechts
- Multi Touch fuer beide Bremsen gleichzeitig wird unterstuetzt
