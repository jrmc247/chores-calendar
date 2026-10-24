# Household chores

A small Angular app that shows the household chores on a calendar. The chores are listed on the left, grouped by color, and appear on their due days in the day, week, month or year view. Phones open on the day view; click a day in the week or month view to open it. Each chore is blue or red, and you decide between you who is which color. Click a chore on the month calendar to tick it off; ticks are not saved and reset on reload. Chores without a fixed day ("twice a week") show in a strip above each week. The panel button at the top left shows or hides the chore list (a drawer on phones), and the ☾/☀ button switches between light and dark; each device remembers its choice.

All chores live in one file, `public/chores.json`. The app reads it when the page loads, so after building you can edit it straight on the Raspberry Pi without rebuilding.

## Editing chores

```json
{
  "chores": [
    {
      "name": "Take out the trash",
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
- To split a chore between blue and red on different days, add it twice with different colors and days (see "Wash the dishes" in the sample file).

To change the colors themselves, edit `--blue` and `--red` at the top of `src/styles.css`.

## Developing

Needs Node.js 22.22.3+ or 24.15+.

```bash
npm install
npm start          # http://localhost:4200, reloads on changes
npm test           # recurrence and validation tests
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

The build is plain static files, so any web server works. With nginx:

1. On the Pi: `sudo apt update && sudo apt install nginx`
2. On your computer: `npm run build`
3. Copy the files to the Pi (replace `pi@raspberrypi.local` with your user and Pi's name or IP):

   ```bash
   scp -r dist/chores-calendar/browser/* pi@raspberrypi.local:/tmp/chores/
   ssh pi@raspberrypi.local "sudo cp -r /tmp/chores/* /var/www/html/"
   ```

   On Windows, `scp` and `ssh` work in PowerShell. Create `/tmp/chores` on the Pi first with `ssh pi@raspberrypi.local "mkdir -p /tmp/chores"`.

4. Open `http://raspberrypi.local/` (or the Pi's IP) from any device on your network.

To change chores later, edit `/var/www/html/chores.json` on the Pi (`sudo nano /var/www/html/chores.json`) and reload the page. When you rebuild, copy your edited `chores.json` back into `public/` first, or it is overwritten by the copy in the build.

The app works from a subfolder too (e.g. `/var/www/html/chores/` served at `http://raspberrypi.local/chores/`).
