import { HttpClient, httpResource } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { addDays, toIsoDate } from '../shared/dates';
import { Chore, ChoresFile, ChoreColor } from './chore.model';
import { Period, isDue, timesDueIn } from './recurrence';
import { validateChore } from './validate-chores';

export type ColorFilter = ChoreColor | 'all';

/** An anytime chore and how often it is due in a week or month. */
export interface AnytimeChore {
  chore: Chore;
  times: number;
}

/** Loads chores.json and answers "what is due when" for the whole app. */
@Injectable({ providedIn: 'root' })
export class ChoreStore {
  // The timestamp skips the browser cache, so edits to chores.json show up on reload.
  private readonly file = httpResource<ChoresFile>(() => `chores.json?v=${Date.now()}`);

  private readonly http = inject(HttpClient);

  /**
   * How often each chore was ticked off, keyed by "color:chore name@YYYY-MM-DD"
   * (the day, or the first day of the week or month). Saved by the server in done.json.
   */
  private readonly done = signal(new Map<string, number>());
  /** True when the last tick could not be saved, e.g. because the server is not running. */
  readonly saveFailed = signal(false);

  readonly colorFilter = signal<ColorFilter>('all');
  readonly isLoading = this.file.isLoading;

  private readonly checkedChores = computed(() =>
    (this.file.value()?.chores ?? []).map((chore, i) => ({
      chore,
      problems: validateChore(chore, i),
    })),
  );

  readonly problems = computed(() => {
    const error = this.file.error();
    if (error) return [`chores.json konnte nicht geladen werden: ${error.message}`];
    return this.checkedChores().flatMap((c) => c.problems);
  });

  /** Valid chores, narrowed to the selected color. */
  readonly chores = computed(() => {
    const filter = this.colorFilter();
    return this.checkedChores()
      .filter((c) => c.problems.length === 0)
      .map((c) => c.chore)
      .filter((chore) => filter === 'all' || chore.color === filter);
  });

  constructor() {
    // Ticks made on other devices show up within half a minute, or when the page is opened again.
    this.loadDone();
    const timer = setInterval(() => this.loadDone(), 30_000);
    const onVisible = () => document.visibilityState === 'visible' && this.loadDone();
    document.addEventListener('visibilitychange', onVisible);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    });
  }

  choresOn(date: Date): Chore[] {
    return this.chores().filter((chore) => isDue(chore.repeat, date));
  }

  /** Anytime chores due in the week or month that begins on `start`. */
  anytimeChoresIn(period: Period, start: Date): AnytimeChore[] {
    return this.chores()
      .map((chore) => ({ chore, times: timesDueIn(chore.repeat, period, start) }))
      .filter((item) => item.times > 0);
  }

  /** The first day from `from` onwards (within a year) on which the chore is due. */
  nextDueDate(chore: Chore, from: Date): Date | null {
    for (let i = 0; i <= 366; i++) {
      const date = addDays(from, i);
      if (isDue(chore.repeat, date)) return date;
    }
    return null;
  }

  /** How many times the chore was ticked off for the day, week or month starting on `start`. */
  doneCount(chore: Chore, start: Date): number {
    return this.done().get(doneKey(chore, start)) ?? 0;
  }

  isDone(chore: Chore, start: Date, times = 1): boolean {
    return this.doneCount(chore, start) >= times;
  }

  /** Ticks the chore off once more; after the last of `times` it starts again from zero. */
  tickOff(chore: Chore, start: Date, times = 1): void {
    const key = doneKey(chore, start);
    const count = (this.doneCount(chore, start) + 1) % (times + 1);
    // Show the tick at once; the server's answer then brings in other devices' ticks too.
    this.done.update((done) => new Map(done).set(key, count));
    this.http.put<DoneFile>('api/done', { key, count }).subscribe({
      next: (done) => this.setDone(done),
      error: () => this.saveFailed.set(true),
    });
  }

  private loadDone(): void {
    this.http.get<DoneFile>('api/done').subscribe({
      next: (done) => this.setDone(done),
      // Without the server (e.g. plain `ng serve`) ticks still work until the page is reloaded.
      error: () => {},
    });
  }

  private setDone(done: DoneFile): void {
    this.done.set(new Map(Object.entries(done)));
    this.saveFailed.set(false);
  }
}

/** What the server stores in done.json. */
type DoneFile = Record<string, number>;

function doneKey(chore: Chore, date: Date): string {
  return `${chore.color}:${chore.name}@${toIsoDate(date)}`;
}
