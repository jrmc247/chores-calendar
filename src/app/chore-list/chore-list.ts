import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ChoreStore } from '../chores/chore-store';
import { PERSON_COLORS } from '../chores/chore.model';
import { describeRepeat } from '../chores/recurrence';
import { Clock } from '../shared/clock';

/** Sidebar: every chore grouped by person, with its schedule and next due day. */
@Component({
  selector: 'app-chore-list',
  imports: [DatePipe],
  templateUrl: './chore-list.html',
  styleUrl: './chore-list.css',
})
export class ChoreList {
  private readonly store = inject(ChoreStore);
  private readonly clock = inject(Clock);

  protected readonly groups = computed(() => {
    const today = this.clock.today();
    return PERSON_COLORS.map((color) => ({
      color,
      person: this.store.people()[color],
      chores: this.store
        .chores()
        .filter((chore) => chore.color === color)
        .map((chore) => ({
          name: chore.name,
          schedule: describeRepeat(chore.repeat),
          nextDue: this.store.nextDueDate(chore, today),
        })),
    })).filter((group) => group.chores.length > 0);
  });
}
