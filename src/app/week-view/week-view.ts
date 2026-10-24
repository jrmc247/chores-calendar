import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { AnytimeStrip } from '../anytime-strip/anytime-strip';
import { ChoreStore } from '../chores/chore-store';
import { Clock } from '../shared/clock';
import { addDays, isSameDay, startOfWeek } from '../shared/dates';

/** Monday to Sunday: seven columns on a wide screen, stacked days on a phone. */
@Component({
  selector: 'app-week-view',
  imports: [AnytimeStrip, DatePipe],
  templateUrl: './week-view.html',
  styleUrl: './week-view.css',
})
export class WeekView {
  /** Any day in the week to show. */
  readonly week = input.required<Date>();
  readonly daySelected = output<Date>();

  protected readonly store = inject(ChoreStore);
  private readonly clock = inject(Clock);

  protected readonly weekStart = computed(() => startOfWeek(this.week()));

  protected readonly anytimeChores = computed(() =>
    this.store.anytimeChoresIn('week', this.weekStart()),
  );

  protected readonly days = computed(() => {
    const today = this.clock.today();
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(this.weekStart(), i);
      return { date, isToday: isSameDay(date, today), chores: this.store.choresOn(date) };
    });
  });
}
