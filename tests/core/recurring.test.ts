import { describe, expect, it } from "vitest";
import { datesFor, expandTemplate, syncRecurringEntriesForBook } from "../../src/core/recurring";
import { createEmptyBook } from "../../src/core/model";
import type { RecurringRule } from "../../src/core/model";

describe("datesFor", () => {
  it("generates monthly rows on day 1", () => {
    expect(datesFor(rule({ frequency: "monthly" }), 2026, 3)).toEqual(["2026-03-01"]);
  });

  it("aligns quarterly rows to the rule start month", () => {
    const quarterly = rule({ frequency: "quarterly", startMonth: 2 });

    expect(datesFor(quarterly, 2026, 2)).toEqual(["2026-02-01"]);
    expect(datesFor(quarterly, 2026, 3)).toEqual([]);
    expect(datesFor(quarterly, 2026, 5)).toEqual(["2026-05-01"]);
  });

  it("supports yearly and specific month patterns", () => {
    expect(datesFor(rule({ frequency: "yearly", startMonth: 6 }), 2026, 6)).toEqual(["2026-06-01"]);
    expect(datesFor(rule({ frequency: "months", pattern: "1,5,9" }), 2026, 5)).toEqual(["2026-05-01"]);
  });

  it("supports day-of-month and exact dd/mm patterns", () => {
    const dates = rule({ frequency: "dates", pattern: "15, 01/06, 15/06" });

    expect(datesFor(dates, 2026, 6)).toEqual(["2026-06-15", "2026-06-01", "2026-06-15"]);
    expect(datesFor(dates, 2026, 7)).toEqual(["2026-07-15"]);
  });

  it("generates every Dutch weekday in a month", () => {
    expect(datesFor(rule({ frequency: "weekday", pattern: "maandag" }), 2026, 6)).toEqual([
      "2026-06-01",
      "2026-06-08",
      "2026-06-15",
      "2026-06-22",
      "2026-06-29",
    ]);
  });

  it("caps occurrences with maxCount across the rule lifetime", () => {
    const capped = rule({ frequency: "monthly", maxCount: 2 });

    expect(datesFor(capped, 2026, 1)).toEqual(["2026-01-01"]);
    expect(datesFor(capped, 2026, 2)).toEqual(["2026-02-01"]);
    expect(datesFor(capped, 2026, 3)).toEqual([]);
  });
});

describe("expandTemplate", () => {
  it("expands Dutch date placeholders", () => {
    expect(expandTemplate("Huishoudgeld {datum} {dag} {maand} {maandnaam} {weekdag}", "2026-06-01")).toBe(
      "Huishoudgeld 01/06 01 06 juni maandag",
    );
  });
});

describe("syncRecurringEntriesForBook", () => {
  it("applies recurring rule entries while preserving manual entries", () => {
    const book = createEmptyBook(2026);
    const january = book.years[0]?.months[0];
    if (!january) throw new Error("Missing January");

    january.entries.push({
      id: "manual-1",
      section: "vaste_kosten",
      subcategoryId: "sub-vast-wonen",
      date: "2026-01-15",
      party: "Handmatig",
      description: "Blijft staan",
      amountCents: 12_00,
      comment: "",
      createdAt: 1,
    });
    book.recurringRules.push(rule({
      id: "rule-huur",
      section: "vaste_kosten",
      subcategoryId: "sub-vast-wonen",
      party: "Woonfonds",
      description: "Huur",
      amountCents: 820_00,
      endYear: 2026,
      endMonth: 12,
    }));

    syncRecurringEntriesForBook(book);
    expect(january.entries.map((entry) => entry.id)).toEqual(["manual-1", "rule-huur-2026-01-01"]);

    book.recurringRules[0] = { ...book.recurringRules[0]!, description: "Huur aangepast", amountCents: 830_00 };
    syncRecurringEntriesForBook(book);
    const synced = january.entries.find((entry) => entry.id === "rule-huur-2026-01-01");
    expect(synced?.description).toBe("Huur aangepast");
    expect(synced?.amountCents).toBe(830_00);
    expect(january.entries.find((entry) => entry.id === "manual-1")?.description).toBe("Blijft staan");
  });
});

function rule(overrides: Partial<RecurringRule>): RecurringRule {
  return {
    id: "rule-1",
    active: true,
    section: "variabele_kosten",
    subcategoryId: "sub-var-huishouden",
    party: "",
    description: "Huishoudgeld",
    amountCents: 9_000,
    startYear: 2026,
    startMonth: 1,
    endYear: null,
    endMonth: null,
    maxCount: null,
    frequency: "monthly",
    pattern: "",
    ...overrides,
  };
}
