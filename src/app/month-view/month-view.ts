import { Component, computed, inject, input, output } from '@angular/core';
import { AnytimeStrip } from '../anytime-strip/anytime-strip';
import { ChoreStore } from '../chores/chore-store';
import { Clock } from '../shared/clock';
import { CALENDAR_WEEKDAYS, isSameDay, monthGrid, startOfMonth } from '../shared/dates';

/**
 * One month as a grid of days. Click a chore to tick it off, or a day number to open that day.
 * Anytime chores sit in a strip above the month and above each week.
 */
@Component({
  selector: 'app-month-view',
  imports: [AnytimeStrip],
  templateUrl: './month-view.html',
  styleUrl: './month-view.css',
})
export class MonthView {
  /** Any day in the month to show. */
  readonly month = input.required<Date>();
  readonly daySelected = output<Date>();

  protected readonly store = inject(ChoreStore);
  private readonly clock = inject(Clock);

  protected readonly weekdays = CALENDAR_WEEKDAYS;

  protected readonly monthStart = computed(() => startOfMonth(this.month()));

  protected readonly monthChores = computed(() =>
    this.store.anytimeChoresIn('month', this.monthStart()),
  );

  protected readonly weeks = computed(() => {
    const month = this.month().getMonth();
    const today = this.clock.today();
    const days = monthGrid(this.month()).map((date) => ({
      date,
      isInMonth: date.getMonth() === month,
      isToday: isSameDay(date, today),
      chores: this.store.choresOn(date),
    }));
    return chunk(days, 7).map((week) => ({
      start: week[0].date,
      anytimeChores: this.store.anytimeChoresIn('week', week[0].date),
      days: week,
    }));
  });
}

function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );
}
