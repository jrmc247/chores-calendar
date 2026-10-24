import { Component, inject, input } from '@angular/core';
import { AnytimeChore, ChoreStore } from '../chores/chore-store';

/** A row of anytime chores for one week or month. Each click ticks off one more time. */
@Component({
  selector: 'app-anytime-strip',
  templateUrl: './anytime-strip.html',
  styleUrl: './anytime-strip.css',
})
export class AnytimeStrip {
  readonly label = input.required<string>();
  /** First day of the week or month the chores belong to. */
  readonly start = input.required<Date>();
  readonly items = input.required<AnytimeChore[]>();

  protected readonly store = inject(ChoreStore);
}
