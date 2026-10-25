import { WEEKDAYS, parseIsoDate } from '../shared/dates';
import { Chore, CHORE_COLORS, MonthlyRule, WeeklyRule } from './chore.model';

/**
 * Checks one hand-written chore from chores.json.
 * Returns readable problems (empty when the chore is fine) so typos show up on the page.
 */
export function validateChore(chore: Chore, position: number): string[] {
  const label = `Aufgabe ${position + 1}${chore?.name ? ` "${chore.name}"` : ''}`;
  return findProblems(chore).map((problem) => `${label}: ${problem}`);
}

function findProblems(chore: Chore): string[] {
  if (typeof chore?.name !== 'string' || !chore.name.trim()) return ['braucht einen "name"'];
  if (!CHORE_COLORS.includes(chore.color))
    return [`"color" muss ${CHORE_COLORS.join(' oder ')} sein`];

  const rule = chore.repeat;
  const problems: string[] = [];
  const check = (ok: boolean, problem: string) => ok || problems.push(problem);

  switch (rule?.type) {
    case 'once':
      check(isList(rule.dates, isIsoDate), '"dates" muss eine Liste wie ["2026-11-14"] sein');
      return problems;
    case 'yearly':
      check(isList(rule.dates, isMonthDay), '"dates" muss eine Liste wie ["03-21"] sein');
      return problems;
    case 'weekly':
      if (rule.times !== undefined) {
        checkTimes(rule, check);
      } else {
        check(
          isList(rule.days, isWeekday),
          `"days" muss eine Liste aus ${WEEKDAYS.join(', ')} sein`,
        );
      }
      break;
    case 'monthly':
      if (rule.times !== undefined) {
        checkTimes(rule, check);
      } else if (rule.days !== undefined) {
        check(
          isList(rule.days, isDayOfMonth),
          '"days" muss eine Liste aus 1 bis 31 oder "last" sein',
        );
      } else {
        check(isWeekday(rule.weekday), '"weekday" muss einer von ' + WEEKDAYS.join(', ') + ' sein');
        check(isNth(rule.nth), '"nth" muss 1 bis 5 oder "last" sein');
      }
      break;
    case 'daily':
      break;
    default:
      return ['"repeat.type" muss once, daily, weekly, monthly oder yearly sein'];
  }

  // Shared by daily, weekly and monthly.
  const every = rule.every ?? 1;
  check(Number.isInteger(every) && every >= 1, '"every" muss eine ganze Zahl ab 1 sein');
  check(every === 1 || rule.start !== undefined, `"every": ${every} braucht ein "start"-Datum`);
  check(
    rule.start === undefined || isIsoDate(rule.start),
    '"start" muss wie "2026-10-05" aussehen',
  );
  check(rule.end === undefined || isIsoDate(rule.end), '"end" muss wie "2026-12-31" aussehen');
  return problems;
}

/** Anytime chores: `times` replaces the days, so they must not be combined. */
function checkTimes(rule: WeeklyRule | MonthlyRule, check: (ok: boolean, problem: string) => void) {
  check(Number.isInteger(rule.times) && rule.times! >= 1, '"times" muss eine ganze Zahl ab 1 sein');
  const fixedDay = rule.days ?? (rule.type === 'monthly' ? rule.weekday : undefined);
  check(fixedDay === undefined, 'entweder "times" oder feste Tage, nicht beides');
}

function isList<T>(value: unknown, isItem: (item: unknown) => boolean): value is T[] {
  return Array.isArray(value) && value.length > 0 && value.every(isItem);
}

function isIsoDate(value: unknown): boolean {
  return typeof value === 'string' && parseIsoDate(value) !== null;
}

function isMonthDay(value: unknown): boolean {
  return typeof value === 'string' && isIsoDate(`2000-${value}`);
}

function isWeekday(value: unknown): boolean {
  return WEEKDAYS.includes(value as never);
}

function isDayOfMonth(value: unknown): boolean {
  return (
    value === 'last' ||
    (Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 31)
  );
}

function isNth(value: unknown): boolean {
  return value === 'last' || [1, 2, 3, 4, 5].includes(value as number);
}
