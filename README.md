# Gym Guide & Tracker

A trek-training workout tracker you can install on your phone. Gym and at-work strength days, easy runs, long runs, long walks and recovery days, with a log, progress stats and a separate 14-day kettlebell plan.

The same app runs in two places:

- **The Claude page** (Gym Guide & Tracker in your Claude account) saves your log and plan to your Claude account, so it is the same on every device.
- **This GitHub version** saves on the phone you use it on, works offline and updates itself.

To move data between them, use **Stats → Download backup** in one, then **Import backup** in the other. The backup includes your log, your plan and your colours.

## Features

- **Program length, 2 to 12 weeks.** Pick it in **Setup**, along with the start date. Run and walk targets and the weekly focus build up across whatever length you choose. Changing the length or start date never deletes what you have logged.
- **Plan tab.**
  - *Routines*: add, rename, reorder and delete exercises in any routine, for both the gym version and the at-work version, and create new routines.
  - *Week*: choose what happens on each day of the week (any routine, a run, a long run, a long walk, recovery or rest).
  - *Runs & walks*: edit names, tips and the week-by-week targets.
- **Colours.** 8 preset themes, or choose the main colour, at-work colour, background, cards and text yourself. The original theme can follow your phone's light or dark mode, or stay fixed on one.
- **Auto update** (GitHub version). Every push to `main` redeploys the app, and installed copies update themselves the next time they are opened.

## Put the GitHub version online (one-time setup)

1. On GitHub, open the repo → **Settings → Pages** → under *Build and deployment* set **Source** to **GitHub Actions**.
2. Merge this branch into `main`. The **Deploy to GitHub Pages** workflow publishes the app at
   `https://<your-username>.github.io/gym-tracker/`.
3. Open that link on your phone and choose **Add to Home Screen** (iPhone: Share → Add to Home Screen; Android: ⋮ → Install app).

## Run it locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Files

| File | What it does |
| --- | --- |
| `index.html` | The whole app (layout, styles and logic). The part between `<!--page-->` and `<!--/page-->` is also what the Claude page uses. |
| `sw.js` | Service worker for offline use and auto-update |
| `manifest.webmanifest`, `icons/` | Make the app installable |
| `.github/workflows/deploy.yml` | Publishes to GitHub Pages on every push to `main` |

When you release changes, bump `APP_VERSION` in `index.html` so Setup shows the new number.
