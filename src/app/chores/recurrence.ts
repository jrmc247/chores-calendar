import {
  Weekday,
  addDays,
  addMonths,
  daysBetween,
  daysInMonth,
  monthsBetween,
  parseIsoDate,
  toIsoDate,
  weekdayOf,
  weeksBetween,
} from '../shared/dates';
import { DayOfMonth, DailyRule, MonthlyRule, NthWeek, Repeat, WeeklyRule } from './chore.model';

type RepeatingRule = DailyRule | WeeklyRule | MonthlyRule;
type AnytimeRule = (WeeklyRule | MonthlyRule) & { times: number };

export type Period = 'week' | 'month';
const PERIOD_RULE = { week: 'weekly', month: 'monthly' } as const;

/** Anytime chores have `times` instead of fixed days, and are never due on a particular day. */
export function isAnytime(rule: Repeat): rule is AnytimeRule {
  return (rule.type === 'weekly' || rule.type === 'monthly') && rule.times !== undefined;
}

/**
 * How many times an anytime chore is due in the week (starting Monday) or month
 * (starting on the 1st) that begins on `start`. 0 for every other kind of chore.
 */
export function timesDueIn(rule: Repeat, period: Period, start: Date): number {
  if (!isAnytime(rule) || rule.type !== PERIOD_RULE[period]) return 0;
  const end = period === 'week' ? addDays(start, 6) : addDays(addMonths(start, 1), -1);
  const overlapsRange =
    (!rule.start || toIsoDate(end) >= rule.start) && (!rule.end || toIsoDate(start) <= rule.end);
  const stepsBetween = period === 'week' ? weeksBetween : monthsBetween;
  return overlapsRange && isOnStep(rule, stepsBetween, start) ? rule.times : 0;
}

/** True when a chore with this rule is due on the given day. */
export function isDue(rule: Repeat, date: Date): boolean {
  switch (rule.type) {
    case 'once':
      return rule.dates.includes(toIsoDate(date));
    case 'yearly':
      return rule.dates.includes(toIsoDate(date).slice(5));
    case 'daily':
      return isInRange(rule, date) && isOnStep(rule, daysBetween, date);
    case 'weekly':
      return (
        isInRange(rule, date) &&
        !!rule.days?.includes(weekdayOf(date)) &&
        isOnStep(rule, weeksBetween, date)
      );
    case 'monthly':
      return (
        isInRange(rule, date) && matchesMonthDay(rule, date) && isOnStep(rule, monthsBetween, date)
      );
  }
}

function isInRange(rule: RepeatingRule, date: Date): boolean {
  const iso = toIsoDate(date);
  return (!rule.start || iso >= rule.start) && (!rule.end || iso <= rule.end);
}

/** With `every: N`, only every Nth day/week/month counted from `start` qualifies. */
function isOnStep(
  rule: RepeatingRule,
  stepsBetween: (from: Date, to: Date) => number,
  date: Date,
): boolean {
  const every = rule.every ?? 1;
  if (every === 1) return true;
  const start = parseIsoDate(rule.start ?? '');
  return start !== null && stepsBetween(start, date) % every === 0;
}

function matchesMonthDay(rule: MonthlyRule, date: Date): boolean {
  if (rule.days) {
    const isLastDay = date.getDate() === daysInMonth(date);
    return rule.days.some((day) => day === date.getDate() || (day === 'last' && isLastDay));
  }
  if (rule.weekday && rule.nth && weekdayOf(date) === rule.weekday) {
    const isLastOfItsKind = date.getDate() + 7 > daysInMonth(date);
    return rule.nth === 'last' ? isLastOfItsKind : Math.ceil(date.getDate() / 7) === rule.nth;
  }
  return false;
}

// ---- Human readable descriptions, shown in the chore list ----

const WEEKDAY_NAMES: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

/** e.g. "Every Monday", "Every 2 weeks on Mon and Wed", "Monthly on the last day", "Twice a week". */
export function describeRepeat(rule: Repeat): string {
  if (isAnytime(rule)) return withEnd(rule, describeAnytime(rule));
  switch (rule.type) {
    case 'once':
      return `On ${listOf(rule.dates.map((d) => formatIsoDate(d)))}`;
    case 'yearly':
      return `Every year on ${listOf(rule.dates.map((d) => formatIsoDate(`2000-${d}`, false)))}`;
    case 'daily':
      return withEnd(rule, every(rule, 'day', 'days'));
    case 'weekly': {
      const days = describeWeekdays(rule.days!);
      return withEnd(
        rule,
        isEveryTime(rule) ? `Every ${days}` : `${every(rule, '', 'weeks')} on ${days}`,
      );
    }
    case 'monthly': {
      const days = describeMonthDays(rule);
      return withEnd(
        rule,
        isEveryTime(rule) ? `Monthly on ${days}` : `${every(rule, '', 'months')} on ${days}`,
      );
    }
  }
}

/** e.g. "Twice a week", "Once every 2 weeks", "3 times a month". */
function describeAnytime(rule: AnytimeRule): string {
  const times = ['Once', 'Twice'][rule.times - 1] ?? `${rule.times} times`;
  const unit = rule.type === 'weekly' ? 'week' : 'month';
  return isEveryTime(rule) ? `${times} a ${unit}` : `${times} every ${rule.every} ${unit}s`;
}

function isEveryTime(rule: RepeatingRule): boolean {
  return (rule.every ?? 1) === 1;
}

function every(rule: RepeatingRule, one: string, many: string): string {
  return isEveryTime(rule) ? `Every ${one}` : `Every ${rule.every} ${many}`;
}

function withEnd(rule: RepeatingRule, text: string): string {
  return rule.end ? `${text}, until ${formatIsoDate(rule.end)}` : text;
}

function describeWeekdays(days: Weekday[]): string {
  return days.length === 1
    ? WEEKDAY_NAMES[days[0]]
    : listOf(days.map((d) => d.slice(0, 1).toUpperCase() + d.slice(1)));
}

function describeMonthDays(rule: MonthlyRule): string {
  if (rule.days) return `the ${listOf(rule.days.map(ordinalDay))}`;
  return `the ${ordinalWeek(rule.nth!)} ${WEEKDAY_NAMES[rule.weekday!]}`;
}

function ordinalDay(day: DayOfMonth): string {
  return day === 'last' ? 'last day' : ordinal(day);
}

function ordinalWeek(nth: NthWeek): string {
  return nth === 'last' ? 'last' : ['first', 'second', 'third', 'fourth', 'fifth'][nth - 1];
}

function ordinal(n: number): string {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th');
  return `${n}${suffix}`;
}

function listOf(items: string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

function formatIsoDate(iso: string, withYear = true): string {
  const date = parseIsoDate(iso);
  if (!date) return iso;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: withYear ? 'numeric' : undefined,
  });
}
