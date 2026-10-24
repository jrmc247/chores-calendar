import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ChoreList } from './chore-list/chore-list';
import { ChoreStore, ColorFilter } from './chores/chore-store';
import { CHORE_COLORS } from './chores/chore.model';
import { MonthView } from './month-view/month-view';
import { Clock } from './shared/clock';
import { addMonths, startOfMonth } from './shared/dates';
import { YearView } from './year-view/year-view';

type CalendarView = 'month' | 'year';

@Component({
  selector: 'app-root',
  imports: [DatePipe, TitleCasePipe, ChoreList, MonthView, YearView],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly store = inject(ChoreStore);
  private readonly clock = inject(Clock);

  protected readonly colors = CHORE_COLORS;
  protected readonly view = signal<CalendarView>('month');
  /** First day of the month on screen (or a month in the year on screen). */
  protected readonly month = signal(startOfMonth(this.clock.today()));

  protected step(direction: -1 | 1): void {
    const months = this.view() === 'month' ? 1 : 12;
    this.month.update((month) => addMonths(month, direction * months));
  }

  protected goToToday(): void {
    this.month.set(startOfMonth(this.clock.today()));
  }

  protected openMonth(month: Date): void {
    this.month.set(month);
    this.view.set('month');
  }

  protected toggleFilter(color: ColorFilter): void {
    this.store.colorFilter.update((current) => (current === color ? 'all' : color));
  }
}
