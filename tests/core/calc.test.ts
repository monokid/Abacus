import { describe, expect, it } from "vitest";
import { monthTotals, yearTotals } from "../../src/core/calc";
import { createYear } from "../../src/core/model";
import { fictionalSampleBook } from "../../src/core/sample-data";

describe("monthTotals", () => {
  it("calculates income, expenses, difference, and rest", () => {
    const year = createYear(2026, 50);
    const january = year.months[0];
    if (!january) throw new Error("Missing January");

    january.entries.push(
      row("income", "inkomsten", null, 1000),
      row("fixed", "vaste_kosten", null, 300),
      row("variable", "variabele_kosten", null, 200),
    );

    expect(monthTotals(january, 50)).toMatchObject({
      income: 1000,
      fixed: 300,
      variable: 200,
      out: 500,
      difference: 500,
      rest: 550,
    });
  });

  it("counts null amounts as zero while preserving them in the model", () => {
    const year = createYear(2026, 0);
    const january = year.months[0];
    if (!january) throw new Error("Missing January");

    january.entries.push(row("income", "inkomsten", null, 100), row("blank", "inkomsten", null, null));

    expect(monthTotals(january, 0).income).toBe(100);
    expect(january.entries[1]?.amount).toBeNull();
  });
});

describe("yearTotals", () => {
  it("carries one month end balance into the next month", () => {
    const year = createYear(2026, 100);
    const january = year.months[0];
    if (!january) throw new Error("Missing January");
    january.entries.push(row("income", "inkomsten", null, 500));

    const totals = yearTotals(year);

    expect(totals.months[0]?.totals.start).toBe(100);
    expect(totals.months[0]?.totals.rest).toBe(600);
    expect(totals.months[1]?.totals.start).toBe(600);
    expect(totals.end).toBe(600);
  });

  it("rolls up fictional sample data with subcategory totals", () => {
    const book = fictionalSampleBook();
    const year = book.years[0];
    if (!year) throw new Error("Missing sample year");

    const totals = yearTotals(year);

    expect(totals.income).toBeCloseTo(4714.12);
    expect(totals.months[0]?.totals.bySubcategory["sub-vast-energie"]).toBeCloseTo(154.31);
    expect(totals.months[1]?.totals.bySubcategory["sub-var-auto"]).toBe(0);
  });
});

function row(id: string, section: "inkomsten" | "vaste_kosten" | "variabele_kosten", subcategoryId: string | null, amount: number | null) {
  return {
    id,
    section,
    subcategoryId,
    date: "2026-01-01",
    party: "",
    description: id,
    amount,
    comment: "",
    createdAt: 1,
  };
}
