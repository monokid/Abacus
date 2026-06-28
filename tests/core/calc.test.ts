import { describe, expect, it } from "vitest";
import { monthTotals, yearTotals } from "../../src/core/calc";
import { createYear, validateBook } from "../../src/core/model";
import { fictionalSampleBook } from "../../src/core/sample-data";

describe("monthTotals", () => {
  it("calculates income, expenses, difference, and rest", () => {
    const year = createYear(2026, 5_000);
    const january = year.months[0];
    if (!january) throw new Error("Missing January");

    january.entries.push(
      row("income", "inkomsten", null, 100_000),
      row("fixed", "vaste_kosten", null, 30_000),
      row("variable", "variabele_kosten", null, 20_000),
    );

    expect(monthTotals(january, 5_000)).toMatchObject({
      incomeCents: 100_000,
      fixedCents: 30_000,
      variableCents: 20_000,
      outCents: 50_000,
      differenceCents: 50_000,
      restCents: 55_000,
    });
  });

  it("counts null amounts as zero while preserving them in the model", () => {
    const year = createYear(2026, 0);
    const january = year.months[0];
    if (!january) throw new Error("Missing January");

    january.entries.push(row("income", "inkomsten", null, 10_000), row("blank", "inkomsten", null, null));

    expect(monthTotals(january, 0).incomeCents).toBe(10_000);
    expect(january.entries[1]?.amountCents).toBeNull();
  });
});

describe("yearTotals", () => {
  it("carries one month end balance into the next month", () => {
    const year = createYear(2026, 10_000);
    const january = year.months[0];
    if (!january) throw new Error("Missing January");
    january.entries.push(row("income", "inkomsten", null, 50_000));

    const totals = yearTotals(year);

    expect(totals.months[0]?.totals.startCents).toBe(10_000);
    expect(totals.months[0]?.totals.restCents).toBe(60_000);
    expect(totals.months[1]?.totals.startCents).toBe(60_000);
    expect(totals.endCents).toBe(60_000);
  });

  it("rolls up fictional sample data with subcategory totals", () => {
    const book = fictionalSampleBook();
    const year = book.years[0];
    if (!year) throw new Error("Missing sample year");

    const totals = yearTotals(year);
    const july = year.months[6];
    const august = year.months[7];
    if (!july || !august) throw new Error("Missing sample summer months");

    expect(validateBook(book)).toEqual([]);
    expect(totals.incomeCents).toBeGreaterThan(3_900_000);
    expect(totals.months[6]?.totals.bySubcategoryCents["sub-vast-reserves"]).toBe(112_200);
    expect(totals.months[6]?.totals.bySubcategoryCents["sub-vast-spar"]).toBe(20_000);
    expect(totals.months[7]?.totals.bySubcategoryCents["sub-vast-bubar"]).toBe(20_258);
    expect(july.entries.some((entry) => entry.party === "Nespresso" && entry.description === "Nespresso")).toBe(true);
    expect(july.entries.some((entry) => entry.description === "mult-phil")).toBe(true);
    expect(august.entries.some((entry) => entry.description === "hotel BilBerge")).toBe(true);
    expect(book.subcategories.map((item) => item.name)).toEqual(expect.arrayContaining(["HH", "Spar", "Divers", "Bubar / Bijdrage", "Koffie"]));
  });
});

function row(
  id: string,
  section: "inkomsten" | "vaste_kosten" | "variabele_kosten",
  subcategoryId: string | null,
  amountCents: number | null,
) {
  return {
    id,
    section,
    subcategoryId,
    date: "2026-01-01",
    party: "",
    description: id,
    amountCents,
    comment: "",
    createdAt: 1,
  };
}
