import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { ChoreStore } from '../chores/chore-store';
import { Clock } from '../shared/clock';
import { CALENDAR_WEEKDAYS, isSameDay, monthGrid } from '../shared/dates';

/** Twelve small months. Each chore shows as a colored dot; click a month to open it. */
@Component({
  selector: 'app-year-view',
  imports: [DatePipe],
  templateUrl: './year-view.html',
  styleUrl: './year-view.css',
})
export class YearView {
  readonly year = input.required<number>();
  readonly monthSelected = output<Date>();

  private readonly store = inject(ChoreStore);
  private readonly clock = inject(Clock);

  protected readonly weekdays = CALENDAR_WEEKDAYS;

  protected readonly months = computed(() => {
    const today = this.clock.today();
    return Array.from({ length: 12 }, (_, index) => {
      const month = new Date(this.year(), index, 1);
      return {
        month,
        days: monthGrid(month).map((date) => ({
          date,
          isInMonth: date.getMonth() === index,
          isToday: isSameDay(date, today),
          colors: this.store.choresOn(date).map((chore) => chore.color),
        })),
      };
    });
  });
}
