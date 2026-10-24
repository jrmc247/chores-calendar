import { Weekday } from '../shared/dates';

/** Shape of public/chores.json. See the README for examples. */
export interface ChoresFile {
  chores: Chore[];
}

export const CHORE_COLORS = ['blue', 'red'] as const;
export type ChoreColor = (typeof CHORE_COLORS)[number];

export interface Chore {
  name: string;
  color: ChoreColor;
  /** Optional emoji shown instead of the name in the month view, e.g. "🧺". */
  icon?: string;
  repeat: Repeat;
}

export type Repeat = OnceRule | DailyRule | WeeklyRule | MonthlyRule | YearlyRule;

/** Optional limits shared by the repeating rules. Dates are "YYYY-MM-DD". */
interface Interval {
  /** Repeat every N days / weeks / months. Defaults to 1. Needs `start` when above 1. */
  every?: number;
  /** First possible day, and the reference point for `every`. */
  start?: string;
  /** Last possible day. */
  end?: string;
}

/** For chores without a fixed day: how many times per week or month. */
interface Anytime {
  times?: number;
}

/** Specific dates, e.g. { "type": "once", "dates": ["2026-11-14"] } */
export interface OnceRule {
  type: 'once';
  dates: string[];
}

/** e.g. { "type": "daily", "every": 3, "start": "2026-10-01" } */
export interface DailyRule extends Interval {
  type: 'daily';
}

/**
 * Fixed days:             { "type": "weekly", "days": ["mon", "wed"] }
 * or any day of the week: { "type": "weekly", "times": 2 }
 */
export interface WeeklyRule extends Interval, Anytime {
  type: 'weekly';
  days?: Weekday[];
}

export type DayOfMonth = number | 'last';
export type NthWeek = 1 | 2 | 3 | 4 | 5 | 'last';

/**
 * Fixed days:              { "type": "monthly", "days": [1, 15, "last"] }
 * an nth weekday:          { "type": "monthly", "weekday": "sat", "nth": 1 }
 * or any day of the month: { "type": "monthly", "times": 1 }
 */
export interface MonthlyRule extends Interval, Anytime {
  type: 'monthly';
  days?: DayOfMonth[];
  weekday?: Weekday;
  nth?: NthWeek;
}

/** Same day(s) every year as "MM-DD", e.g. { "type": "yearly", "dates": ["03-21"] } */
export interface YearlyRule {
  type: 'yearly';
  dates: string[];
}
