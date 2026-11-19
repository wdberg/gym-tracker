# Gym Guide & Tracker

A trek-training workout tracker you can install on your phone. Gym and at-work strength days, easy runs, long runs, long walks and recovery days, with a log, progress stats and a separate 14-day kettlebell plan.

The same app runs in two places:

- **The Claude page** (Gym Guide & Tracker in your Claude account) saves your log and plan to your Claude account, so it is the same on every device.
- **This GitHub version** works offline, updates itself, and syncs across devices when you sign in (Setup → Sync across devices).

To move data between them, use **Stats → Download backup** in one, then **Import backup** in the other. The backup includes your log, your plan and your colours.

## Sync across devices (GitHub version)

Sign in under **Setup** with your email and password. Your log, plan, colours and 14-day progress are stored in Supabase (project `gym-tracker`) and merged on every device you sign in on. For each day, the most recent edit wins. Edits made offline sync when you're back online.

- Tables: `logs` (one row per day) and `settings` (plan, colours, 14-day progress). Row-level security means each account can only read and write its own rows.
- The key in `index.html` is Supabase's public anon key. It is safe to publish; the security rules above are what protect the data.
- The sync library is bundled in `vendor/supabase.js` (supabase-js 2.45.4, MIT licence) so the app keeps working offline.

## Features

- **Program length, 2 to 12 weeks.** Pick it in **Setup**, along with the start date. Run and walk targets and the weekly focus build up across whatever length you choose. Changing the length or start date never deletes what you have logged.
- **Guide tab.** Gym and at-work routines, runs and walks, 10 quick 20–30 minute sessions and 6 yoga flows. Exercises have a **How to** button with position pictures, steps, what to avoid and a video link. Quick sessions and yoga flows can be marked done and show up in Today and Stats.
- **Timers.** A workout timer on Today (start, pause, finish & log fills in your minutes; keeps the screen on) and a rest timer that starts when you tick off an exercise, with +15s and skip. Choose the sound it plays when rest is over (beep, chime, bell, boxing bell, whistle, buzzer or off) and its volume in Setup, along with the default rest time and auto-start.
- **Music.** A button to open your Spotify playlist, set once and synced across devices.
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
| `vendor/supabase.js` | Supabase client used for sign-in and sync |
| `manifest.webmanifest`, `icons/` | Make the app installable |
| `.github/workflows/deploy.yml` | Publishes to GitHub Pages on every push to `main` |

When you release changes, bump `APP_VERSION` in `index.html` so Setup shows the new number.
