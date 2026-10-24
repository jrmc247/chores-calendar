import { Component, computed, inject, input } from '@angular/core';
import { AnytimeStrip } from '../anytime-strip/anytime-strip';
import { ChoreStore } from '../chores/chore-store';
import { startOfMonth, startOfWeek } from '../shared/dates';

/** One day as a simple list, for small screens. Anytime chores of its week and month follow. */
@Component({
  selector: 'app-day-view',
  imports: [AnytimeStrip],
  templateUrl: './day-view.html',
  styleUrl: './day-view.css',
})
export class DayView {
  readonly day = input.required<Date>();

  protected readonly store = inject(ChoreStore);

  protected readonly chores = computed(() => this.store.choresOn(this.day()));

  protected readonly weekStart = computed(() => startOfWeek(this.day()));
  protected readonly weekChores = computed(() =>
    this.store.anytimeChoresIn('week', this.weekStart()),
  );

  protected readonly monthStart = computed(() => startOfMonth(this.day()));
  protected readonly monthChores = computed(() =>
    this.store.anytimeChoresIn('month', this.monthStart()),
  );
}
