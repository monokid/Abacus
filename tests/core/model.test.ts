import { describe, expect, it } from "vitest";
import { createEmptyBook, subcategoriesFor, validateBook } from "../../src/core/model";

describe("model", () => {
  it("creates one complete year with 12 months", () => {
    const book = createEmptyBook(2026);

    expect(book.years).toHaveLength(1);
    expect(book.years[0]?.year).toBe(2026);
    expect(book.years[0]?.months.map((month) => month.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(validateBook(book)).toEqual([]);
  });

  it("keeps subcategories scoped to one top-level section", () => {
    const book = createEmptyBook(2026);

    expect(subcategoriesFor(book, "inkomsten").map((item) => item.name)).toEqual([
      "Pensioen",
      "Terugbetalingen",
      "Familie",
    ]);
    expect(subcategoriesFor(book, "vaste_kosten").every((item) => item.section === "vaste_kosten")).toBe(true);
  });

  it("rejects entries that use a subcategory from another section", () => {
    const book = createEmptyBook(2026);
    const january = book.years[0]?.months[0];
    if (!january) throw new Error("Missing January");

    january.entries.push({
      id: "bad-entry",
      section: "inkomsten",
      subcategoryId: "sub-vast-wonen",
      date: "2026-01-01",
      party: "",
      description: "Verkeerd gekoppeld",
      amountCents: 1_000,
      comment: "",
      createdAt: 1,
    });

    expect(validateBook(book)).toContain("Boekingsregel 'bad-entry' gebruikt een subcategorie uit de verkeerde hoofdgroep.");
  });

  it("rejects recurring rules with invalid cents or subcategory scope", () => {
    const book = createEmptyBook(2026);

    book.recurringRules.push({
      id: "bad-rule",
      active: true,
      section: "inkomsten",
      subcategoryId: "sub-vast-wonen",
      party: "",
      description: "Verkeerd gekoppeld",
      amountCents: 12.5,
      startYear: 2026,
      startMonth: 1,
      endYear: null,
      endMonth: null,
      maxCount: null,
      frequency: "monthly",
      pattern: "",
    });

    expect(validateBook(book)).toEqual(
      expect.arrayContaining([
        "Terugkerende regel 'bad-rule' gebruikt een subcategorie uit de verkeerde hoofdgroep.",
        "Terugkerende regel 'bad-rule' heeft geen geheel aantal cent.",
      ]),
    );
  });
});
