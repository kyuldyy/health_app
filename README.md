# Ember

Workout and food tracker, built as an installable mobile-first web app (PWA). Data is stored on-device in IndexedDB.

## Develop
```
npm install
npm run dev      # local dev server
npm test         # unit tests
npm run build    # type-check and production build
```

## Status
- Milestone 1: workout tracker (done): exercise library, workout logging, set types (W/D/F), supersets, rest timer, per-exercise progress, templates, history, backup/restore.
- Milestone 2: food side (done): food log with daily macros and targets, pantry, food search (USDA FoodData Central + Open Food Facts), barcode scan (camera where supported, manual entry otherwise), custom foods, saved meals, meal ideas from Claude (user-supplied API key stored on device) and from saved meals the pantry can cover, Today screen macros.
- Milestone 3: polish (done): PNG icons for install, screen stays awake during workouts, error boundary, focus styles, CI and GitHub Pages deploy workflows.

## Deploy
Enable GitHub Pages (Settings, Pages, Source: GitHub Actions); pushes to main then publish the app. Open the URL on your phone and use Add to Home Screen.
