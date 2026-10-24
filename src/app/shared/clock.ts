import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { isSameDay, today } from './dates';

/** Today's date, kept current so a screen left on overnight moves to the new day. */
@Injectable({ providedIn: 'root' })
export class Clock {
  readonly today = signal(today());

  constructor() {
    const timer = setInterval(() => {
      const now = today();
      if (!isSameDay(now, this.today())) this.today.set(now);
    }, 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
}
