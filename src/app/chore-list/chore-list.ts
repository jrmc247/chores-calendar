import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ChoreStore } from '../chores/chore-store';
import { CHORE_COLORS, COLOR_LABELS } from '../chores/chore.model';
import { describeRepeat } from '../chores/recurrence';
import { Clock } from '../shared/clock';

/** Sidebar: every chore grouped by color, with its schedule and next due day. */
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
    return CHORE_COLORS.map((color) => ({
      color,
      label: COLOR_LABELS[color],
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
