import { Component, computed, inject, input } from '@angular/core';
import { ChoreStore } from '../chores/chore-store';
import { Clock } from '../shared/clock';
import { CALENDAR_WEEKDAYS, isSameDay, monthGrid } from '../shared/dates';

/** One month as a grid of days. Click a chore to tick it off for that day. */
@Component({
  selector: 'app-month-view',
  templateUrl: './month-view.html',
  styleUrl: './month-view.css',
})
export class MonthView {
  /** Any day in the month to show. */
  readonly month = input.required<Date>();

  protected readonly store = inject(ChoreStore);
  private readonly clock = inject(Clock);

  protected readonly weekdays = CALENDAR_WEEKDAYS;

  protected readonly days = computed(() => {
    const month = this.month().getMonth();
    const today = this.clock.today();
    return monthGrid(this.month()).map((date) => ({
      date,
      isInMonth: date.getMonth() === month,
      isToday: isSameDay(date, today),
      chores: this.store.choresOn(date),
    }));
  });
}
