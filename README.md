# Thermik Trainer (MVP Setup Test)

## Voraussetzungen
- Node.js (LTS)
- npm

## Start
```bash
npm install
npm run dev
```

## MVP Verhalten
- Startposition: x=200, y=350, Heading 0 Grad (nach rechts).
- Bremsen: Zielwerte steigen/sinken linear bei Tastendruck; reale Bremsen folgen mit RampRate 2.0/s.
- Pause: Simulation friert, Audio wird stumm; Rendering bleibt aktiv.
