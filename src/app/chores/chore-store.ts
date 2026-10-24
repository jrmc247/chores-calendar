import { httpResource } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { addDays, toIsoDate } from '../shared/dates';
import { Chore, ChoresFile, PersonColor } from './chore.model';
import { isDue } from './recurrence';
import { validateChore } from './validate-chores';

export type ColorFilter = PersonColor | 'all';

/** Loads chores.json and answers "what is due when" for the whole app. */
@Injectable({ providedIn: 'root' })
export class ChoreStore {
  // The timestamp skips the browser cache, so edits to chores.json show up on reload.
  private readonly file = httpResource<ChoresFile>(() => `chores.json?v=${Date.now()}`);

  /** Days ticked off in this browser tab, as "color:chore name@YYYY-MM-DD". Not saved. */
  private readonly done = signal(new Set<string>());

  readonly colorFilter = signal<ColorFilter>('all');
  readonly isLoading = this.file.isLoading;

  readonly people = computed<Record<PersonColor, string>>(
    () => this.file.value()?.people ?? { blue: 'Blue', red: 'Red' },
  );

  private readonly checkedChores = computed(() =>
    (this.file.value()?.chores ?? []).map((chore, i) => ({
      chore,
      problems: validateChore(chore, i),
    })),
  );

  readonly problems = computed(() => {
    const error = this.file.error();
    if (error) return [`Could not load chores.json: ${error.message}`];
    return this.checkedChores().flatMap((c) => c.problems);
  });

  /** Valid chores, narrowed to the selected person. */
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

  /** The first day from `from` onwards (within a year) on which the chore is due. */
  nextDueDate(chore: Chore, from: Date): Date | null {
    for (let i = 0; i <= 366; i++) {
      const date = addDays(from, i);
      if (isDue(chore.repeat, date)) return date;
    }
    return null;
  }

  isDone(chore: Chore, date: Date): boolean {
    return this.done().has(doneKey(chore, date));
  }

  toggleDone(chore: Chore, date: Date): void {
    this.done.update((done) => {
      const next = new Set(done);
      const key = doneKey(chore, date);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }
}

function doneKey(chore: Chore, date: Date): string {
  return `${chore.color}:${chore.name}@${toIsoDate(date)}`;
}
