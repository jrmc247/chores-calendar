import { httpResource } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
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

  /**
   * How often each chore was ticked off in this browser tab, keyed by
   * "color:chore name@YYYY-MM-DD" (the day, or the first day of the week or month). Not saved.
   */
  private readonly done = signal(new Map<string, number>());

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
    this.done.update((done) => new Map(done).set(key, ((done.get(key) ?? 0) + 1) % (times + 1)));
  }
}

function doneKey(chore: Chore, date: Date): string {
  return `${chore.color}:${chore.name}@${toIsoDate(date)}`;
}
