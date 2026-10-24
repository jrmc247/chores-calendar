import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ChoreList } from './chore-list/chore-list';
import { ChoreStore, ColorFilter } from './chores/chore-store';
import { CHORE_COLORS } from './chores/chore.model';
import { DayView } from './day-view/day-view';
import { MonthView } from './month-view/month-view';
import { Clock } from './shared/clock';
import { addDays, addMonths } from './shared/dates';
import { YearView } from './year-view/year-view';

type CalendarView = 'day' | 'month' | 'year';

const HEADING_FORMATS: Record<CalendarView, string> = {
  day: 'EEEE d MMMM y',
  month: 'MMMM y',
  year: 'y',
};

/** Phones open on the day view; a month grid is too crowded there. */
const isSmallScreen = () => window.matchMedia('(max-width: 600px)').matches;

@Component({
  selector: 'app-root',
  imports: [DatePipe, TitleCasePipe, ChoreList, DayView, MonthView, YearView],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly store = inject(ChoreStore);
  private readonly clock = inject(Clock);

  protected readonly colors = CHORE_COLORS;
  protected readonly views: CalendarView[] = ['day', 'month', 'year'];
  protected readonly view = signal<CalendarView>(isSmallScreen() ? 'day' : 'month');
  /** The day on screen; the month and year views show the month and year around it. */
  protected readonly date = signal(this.clock.today());
  protected readonly headingFormat = computed(() => HEADING_FORMATS[this.view()]);

  protected step(direction: -1 | 1): void {
    this.date.update((date) => {
      switch (this.view()) {
        case 'day':
          return addDays(date, direction);
        case 'month':
          return addMonths(date, direction);
        case 'year':
          return addMonths(date, direction * 12);
      }
    });
  }

  protected goToToday(): void {
    this.date.set(this.clock.today());
  }

  protected open(view: CalendarView, date: Date): void {
    this.date.set(date);
    this.view.set(view);
  }

  protected toggleFilter(color: ColorFilter): void {
    this.store.colorFilter.update((current) => (current === color ? 'all' : color));
  }
}
