# Household chores

A small Angular app that shows the household chores on a calendar. The chores are listed on the left, grouped by color, and appear on their due days in the day, week, month or year view. Phones open on the day view; click a day in the week or month view to open it. Each chore is blue or red, and you decide between you who is which color. The interface is in German. Click a chore on the month calendar to tick it off; ticks are saved on the Raspberry Pi, so every phone and computer sees the same ones. Chores without a fixed day ("twice a week") show in a strip above each week. The panel button at the top left shows or hides the chore list (a drawer on phones), and the ☾/☀ button switches between light and dark; each device remembers its choice.

All chores live in one file, `public/chores.json`. Push a change to it and the Raspberry Pi picks it up within a few minutes (see [Hosting on a Raspberry Pi](#hosting-on-a-raspberry-pi)).

## Editing chores

```json
{
  "chores": [
    {
      "name": "Abfall rausbringen",
      "color": "blue",
      "repeat": { "type": "weekly", "days": ["mon"] }
    }
  ]
}
```

- Each chore has a `name`, a `color` (`"blue"` or `"red"`) and a `repeat` rule.
- If something in the file is wrong, the page shows a red box saying which chore and what to fix. The other chores keep working.

### Repeat rules

| What you want                 | `repeat`                                                                   |
| ----------------------------- | -------------------------------------------------------------------------- |
| Every Monday                  | `{ "type": "weekly", "days": ["mon"] }`                                    |
| Every Mon, Tue and Wed        | `{ "type": "weekly", "days": ["mon", "tue", "wed"] }`                      |
| Every second Monday           | `{ "type": "weekly", "days": ["mon"], "every": 2, "start": "2026-10-05" }` |
| Every day                     | `{ "type": "daily" }`                                                      |
| Every 3 days                  | `{ "type": "daily", "every": 3, "start": "2026-10-01" }`                   |
| Last day of the month         | `{ "type": "monthly", "days": ["last"] }`                                  |
| The 1st and 15th of the month | `{ "type": "monthly", "days": [1, 15] }`                                   |
| Every 3 months on the 15th    | `{ "type": "monthly", "days": [15], "every": 3, "start": "2026-10-01" }`   |
| First Saturday of the month   | `{ "type": "monthly", "weekday": "sat", "nth": 1 }`                        |
| Last Friday of the month      | `{ "type": "monthly", "weekday": "fri", "nth": "last" }`                   |
| Same day every year           | `{ "type": "yearly", "dates": ["03-01", "09-01"] }`                        |
| Once, on specific dates       | `{ "type": "once", "dates": ["2026-11-14"] }`                              |
| Twice a week, any day         | `{ "type": "weekly", "times": 2 }`                                         |
| Once every 2 weeks, any day   | `{ "type": "weekly", "times": 1, "every": 2, "start": "2026-10-05" }`      |
| Once a month, any day         | `{ "type": "monthly", "times": 1 }`                                        |

Details:

- Weekdays are written `mon`, `tue`, `wed`, `thu`, `fri`, `sat`, `sun`. Dates are `YYYY-MM-DD`; yearly dates are `MM-DD`.
- `every` repeats every N days, weeks or months, counted from `start`. `start` is required when `every` is above 1. For weekly rules, the week that contains `start` is the first one, so pick a `start` in a week where the chore is due.
- `start` and `end` also work on their own with `daily`, `weekly` and `monthly`, to limit when a chore applies (e.g. `"end": "2026-12-31"`).
- A day that does not exist in a month (e.g. the 31st in November) is skipped. Use `"last"` for "end of the month".
- **Anytime chores** (laundry, taking out the trash) use `times` instead of `days`: they have no fixed day and show in an "Anytime" strip above each week, or above the month for monthly ones. Click one each time you do it; with `"times": 2` it counts 0/2, 1/2, 2/2. They don't appear in the year view.
- To split a chore between blue and red on different days, add it twice with different colors and days.

To change the colors themselves, edit `--blue` and `--red` at the top of `src/styles.css`.

## Developing

Needs Node.js 22.22.3+ or 24.15+.

```bash
npm install
npm start          # http://localhost:4200, reloads on changes
npm test           # recurrence and validation tests
npm run server     # the tick server on :8080; npm start forwards /api to it
npm run build      # static files in dist/chores-calendar/browser
```

Code layout (`src/app`):

- `chores/chore.model.ts`: the shape of `chores.json`.
- `chores/recurrence.ts`: decides whether a chore is due on a day, and describes rules in words.
- `chores/validate-chores.ts`: the readable error messages for mistakes in `chores.json`.
- `chores/chore-store.ts`: loads the file, filters by color, keeps the ticked-off state.
- `chore-list`, `day-view`, `week-view`, `month-view`, `year-view`: the parts of the screen.
- `anytime-strip`: the row of anytime chores above a week or month.
- `shared/dates.ts`: date helpers (weeks start on Monday).

## Hosting on a Raspberry Pi

`server/server.mjs` is a small Node server with no dependencies. It serves the built app and saves the ticks to `server/data/done.json`, so they survive reloads and are shared by every device. Ticks from other devices show up within 30 seconds.

The Pi updates itself. Every push to `main` runs the tests and the build on GitHub (`.github/workflows/deploy.yml`) and puts the result on the `deploy` branch. The Pi checks that branch every 2 minutes, and when there is a new build it takes it and restarts the server. So a change pushed to GitHub is live on the Pi about 5 minutes later, and nothing has to be copied by hand.

### One-time setup

On the Pi (with a keyboard and screen, or over `ssh pi@raspberrypi.local` from your computer), run:

```bash
curl -fsSL https://raw.githubusercontent.com/jrmc247/chores-calendar/main/deploy/pi/setup.sh | sudo bash
```

It installs git and Node.js 20+, downloads the app to `/opt/chores-calendar`, turns off nginx (the app's own server uses port 80), starts the update timer and starts the app. Then open `http://raspberrypi.local/` (or the Pi's IP) from any device on your network.

The server runs as the user `pi`, which is created if your Pi does not have it. Running the setup again is safe.

### Day to day

- See what the Pi deployed: `journalctl -u chores-deploy`. Each update logs `Deployed: Deploy abc1234: <commit message>`.
- Update right now instead of waiting: `sudo /opt/chores-calendar/deploy/pi/update.sh --force`.
- Server logs: `journalctl -u chores-calendar`.
- If a push breaks the tests or the build, the run fails on GitHub (the Actions tab) and the Pi keeps the last working version.

The saved ticks in `server/data/` are never touched by an update.

Change chores in `public/chores.json` in the repo, so they go through GitHub like everything else. If you edit `/opt/chores-calendar/dist/chores-calendar/browser/chores.json` on the Pi instead, the Pi keeps your edit and from then on ignores `chores.json` from GitHub (the deploy log says so). To go back to the GitHub version, run `sudo git -C /opt/chores-calendar checkout -- dist/chores-calendar/browser/chores.json`.

The server reads `PORT`, `STATIC_DIR` and `DATA_FILE` from the environment if you want other places.

### Saved ticks

`done.json` maps `"color:chore name@date"` to how often the chore was ticked off for that day, or for the week or month starting on that date. A chore renamed in `chores.json` starts with no ticks. This file is also the history for counting finished chores later.
