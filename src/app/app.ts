import { TitleCasePipe, formatDate } from '@angular/common';
import { Component, LOCALE_ID, computed, effect, inject, signal } from '@angular/core';
import { ChoreList } from './chore-list/chore-list';
import { ChoreStore, ColorFilter } from './chores/chore-store';
import { CHORE_COLORS } from './chores/chore.model';
import { DayView } from './day-view/day-view';
import { MonthView } from './month-view/month-view';
import { Clock } from './shared/clock';
import { addDays, addMonths, startOfWeek } from './shared/dates';
import { storedSignal } from './shared/stored-signal';
import { WeekView } from './week-view/week-view';
import { YearView } from './year-view/year-view';

type CalendarView = 'day' | 'week' | 'month' | 'year';

const PANEL_STATES = ['open', 'closed'] as const;
type PanelState = (typeof PANEL_STATES)[number];

const THEMES = ['light', 'dark'] as const;
type Theme = (typeof THEMES)[number];

/** Phones open on the day view; a month grid is too crowded there. */
const isSmallScreen = () => window.matchMedia('(max-width: 600px)').matches;
/** Below this width the chore list is a drawer over the calendar instead of a sidebar. */
const isNarrowScreen = () => window.matchMedia('(max-width: 800px)').matches;
const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

@Component({
  selector: 'app-root',
  imports: [TitleCasePipe, ChoreList, DayView, WeekView, MonthView, YearView],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly store = inject(ChoreStore);
  private readonly clock = inject(Clock);
  private readonly locale = inject(LOCALE_ID);

  protected readonly colors = CHORE_COLORS;
  protected readonly views: CalendarView[] = ['day', 'week', 'month', 'year'];
  /** The chore list panel. Remembered on wide screens; a drawer on narrow ones always starts closed. */
  protected readonly listPanel = storedSignal<PanelState>('chores.list', 'open', PANEL_STATES);
  /** Starts from the device setting; the switch overrides it on this device. */
  protected readonly theme = storedSignal<Theme>(
    'chores.theme',
    prefersDark() ? 'dark' : 'light',
    THEMES,
  );

  constructor() {
    if (isNarrowScreen()) this.listPanel.set('closed');
    effect(() => (document.documentElement.dataset['theme'] = this.theme()));
  }
  protected readonly view = signal<CalendarView>(isSmallScreen() ? 'day' : 'month');
  /** The day on screen; the month and year views show the month and year around it. */
  protected readonly date = signal(this.clock.today());

  protected readonly heading = computed(() => {
    const format = (date: Date, pattern: string) => formatDate(date, pattern, this.locale);
    const date = this.date();
    switch (this.view()) {
      case 'day':
        return format(date, 'EEEE d MMMM y');
      case 'week': {
        const monday = startOfWeek(date);
        return `${format(monday, 'd MMM')} – ${format(addDays(monday, 6), 'd MMM y')}`;
      }
      case 'month':
        return format(date, 'MMMM y');
      case 'year':
        return format(date, 'y');
    }
  });

  protected step(direction: -1 | 1): void {
    this.date.update((date) => {
      switch (this.view()) {
        case 'day':
          return addDays(date, direction);
        case 'week':
          return addDays(date, direction * 7);
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

  protected toggleList(): void {
    this.listPanel.update((state) => (state === 'open' ? 'closed' : 'open'));
  }

  protected toggleTheme(): void {
    this.theme.update((theme) => (theme === 'light' ? 'dark' : 'light'));
  }

  protected toggleFilter(color: ColorFilter): void {
    this.store.colorFilter.update((current) => (current === color ? 'all' : color));
  }
}
