import type { BudgetMonth, BudgetYear, Entry } from "./model";
import type { Section } from "./sections";

export interface MonthTotals {
  startCents: number;
  incomeCents: number;
  fixedCents: number;
  variableCents: number;
  outCents: number;
  differenceCents: number;
  restCents: number;
  bySubcategoryCents: Record<string, number>;
}

export interface MonthSummary {
  month: number;
  totals: MonthTotals;
}

export interface YearTotals {
  startCents: number;
  incomeCents: number;
  outCents: number;
  differenceCents: number;
  endCents: number;
  months: MonthSummary[];
}

export function monthTotals(month: BudgetMonth, startCents: number): MonthTotals {
  const incomeCents = sumSection(month.entries, "inkomsten");
  const fixedCents = sumSection(month.entries, "vaste_kosten");
  const variableCents = sumSection(month.entries, "variabele_kosten");
  const outCents = fixedCents + variableCents;
  const differenceCents = incomeCents - outCents;
  const restCents = startCents + differenceCents;

  return {
    startCents,
    incomeCents,
    fixedCents,
    variableCents,
    outCents,
    differenceCents,
    restCents,
    bySubcategoryCents: sumBySubcategory(month.entries),
  };
}

export function yearTotals(year: BudgetYear): YearTotals {
  let carryCents = year.startBalanceCents;
  const months = [...year.months]
    .sort((left, right) => left.month - right.month)
    .map((month) => {
      const totals = monthTotals(month, carryCents);
      carryCents = totals.restCents;
      return { month: month.month, totals };
    });

  const incomeCents = months.reduce((total, month) => total + month.totals.incomeCents, 0);
  const outCents = months.reduce((total, month) => total + month.totals.outCents, 0);

  return {
    startCents: year.startBalanceCents,
    incomeCents,
    outCents,
    differenceCents: incomeCents - outCents,
    endCents: carryCents,
    months,
  };
}

function sumSection(entries: Entry[], section: Section): number {
  return entries
    .filter((entry) => entry.section === section)
    .reduce((total, entry) => total + (entry.amountCents ?? 0), 0);
}

function sumBySubcategory(entries: Entry[]): Record<string, number> {
  return entries.reduce<Record<string, number>>((totals, entry) => {
    if (!entry.subcategoryId) return totals;
    totals[entry.subcategoryId] = (totals[entry.subcategoryId] ?? 0) + (entry.amountCents ?? 0);
    return totals;
  }, {});
}
