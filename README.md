# Gym Tracker

A workout tracker you can install on your phone. It works offline, keeps all data on your device, and updates itself when new code is pushed to GitHub.

## Features

- **Programs from 2 to 12 weeks.** Pick any length, choose a template (Full Body, Upper/Lower, Push/Pull/Legs 3- or 6-day, Body Part Split) or build a custom schedule from your own routines with 1–7 days per week. Optional weekly weight increase and a lighter deload week at the end. You can change the length of a program while it is running.
- **Routines tab.** Create, edit, duplicate and delete routines (exercise, sets, reps and rest for each), and add, edit or delete exercises grouped by muscle.
- **Workout logging.** Fills in your last weight, ticks sets off, starts a rest timer automatically, and lets you add or remove sets and exercises mid-workout.
- **History.** Every workout with its volume, plus your personal best for each exercise.
- **Colours.** 8 preset themes, or set the main colour, accent, background, cards, text and tab bar yourself. Text colour on buttons adjusts automatically so it stays readable.
- **Backup.** Export and import your data as a JSON file.
- **Auto update.** Each push to `main` redeploys the app. Open copies notice the new version and reload into it, but never in the middle of a workout.

## Put it online (one-time setup)

1. On GitHub, open the repo → **Settings → Pages** → under *Build and deployment* set **Source** to **GitHub Actions**.
2. Merge your changes into the `main` branch. The **Deploy to GitHub Pages** workflow runs and publishes the app at
   `https://<your-username>.github.io/gym-tracker/`.
3. Open that link on your phone and choose **Add to Home Screen** (iPhone: Share → Add to Home Screen; Android: ⋮ → Install app).

After that, every push to `main` updates the app automatically.

## Run it locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Files

| File | What it does |
| --- | --- |
| `index.html` | Page layout and bottom tabs |
| `styles.css` | Styling; all colours are CSS variables |
| `app.js` | All app logic: programs, routines, logging, themes, updates |
| `sw.js` | Service worker for offline use and auto-update |
| `manifest.webmanifest` | Makes the app installable |
| `.github/workflows/deploy.yml` | Publishes to GitHub Pages on every push to `main` |

When you release changes, also bump `APP_VERSION` in `app.js` so the Settings tab shows the new number.
