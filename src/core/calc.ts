import type { BudgetMonth, BudgetYear, Entry } from "./model";
import type { Section } from "./sections";

export interface MonthTotals {
  start: number;
  income: number;
  fixed: number;
  variable: number;
  out: number;
  difference: number;
  rest: number;
  bySubcategory: Record<string, number>;
}

export interface MonthSummary {
  month: number;
  totals: MonthTotals;
}

export interface YearTotals {
  start: number;
  income: number;
  out: number;
  difference: number;
  end: number;
  months: MonthSummary[];
}

export function monthTotals(month: BudgetMonth, start: number): MonthTotals {
  const income = sumSection(month.entries, "inkomsten");
  const fixed = sumSection(month.entries, "vaste_kosten");
  const variable = sumSection(month.entries, "variabele_kosten");
  const out = fixed + variable;
  const difference = income - out;
  const rest = start + difference;

  return {
    start,
    income,
    fixed,
    variable,
    out,
    difference,
    rest,
    bySubcategory: sumBySubcategory(month.entries),
  };
}

export function yearTotals(year: BudgetYear): YearTotals {
  let carry = year.startBalance;
  const months = [...year.months]
    .sort((left, right) => left.month - right.month)
    .map((month) => {
      const totals = monthTotals(month, carry);
      carry = totals.rest;
      return { month: month.month, totals };
    });

  const income = months.reduce((total, month) => total + month.totals.income, 0);
  const out = months.reduce((total, month) => total + month.totals.out, 0);

  return {
    start: year.startBalance,
    income,
    out,
    difference: income - out,
    end: carry,
    months,
  };
}

function sumSection(entries: Entry[], section: Section): number {
  return entries
    .filter((entry) => entry.section === section)
    .reduce((total, entry) => total + (entry.amount ?? 0), 0);
}

function sumBySubcategory(entries: Entry[]): Record<string, number> {
  return entries.reduce<Record<string, number>>((totals, entry) => {
    if (!entry.subcategoryId) return totals;
    totals[entry.subcategoryId] = (totals[entry.subcategoryId] ?? 0) + (entry.amount ?? 0);
    return totals;
  }, {});
}
