import { describe, expect, it } from "vitest";
import { addSubcategory, createEmptyBook, moveSubcategory, renameSubcategory, subcategoriesFor, subcategoryUsage, validateBook } from "../../src/core/model";

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

  it("adds, renames and reorders subcategories with stable ids", () => {
    const book = createEmptyBook(2026);

    const apotheek = addSubcategory(book, "variabele_kosten", "Apotheek Extra", 42);
    expect(apotheek.id).toBe("sub-variabele-apotheek-extra");
    expect(subcategoriesFor(book, "variabele_kosten").at(-1)?.name).toBe("Apotheek Extra");

    renameSubcategory(book, apotheek.id, "Apotheek");
    expect(book.subcategories.find((item) => item.id === apotheek.id)?.name).toBe("Apotheek");

    moveSubcategory(book, apotheek.id, -1);
    const names = subcategoriesFor(book, "variabele_kosten").map((item) => item.name);
    expect(names.indexOf("Apotheek")).toBeLessThan(names.indexOf("Auto"));
    expect(validateBook(book)).toEqual([]);
  });

  it("rejects duplicate subcategory names inside one section", () => {
    const book = createEmptyBook(2026);

    expect(() => addSubcategory(book, "inkomsten", "Pensioen")).toThrow("Deze subcategorie bestaat al in deze hoofdgroep.");
    expect(() => renameSubcategory(book, "sub-ink-familie", "Terugbetalingen")).toThrow("Deze subcategorie bestaat al in deze hoofdgroep.");
  });

  it("counts subcategory usage across entries and recurring rules", () => {
    const book = createEmptyBook(2026);
    const january = book.years[0]?.months[0];
    if (!january) throw new Error("Missing January");

    january.entries.push({
      id: "entry-1",
      section: "vaste_kosten",
      subcategoryId: "sub-vast-wonen",
      date: "2026-01-01",
      party: "Woonfonds",
      description: "Huur",
      amountCents: 820_00,
      comment: "",
      createdAt: 1,
    });
    book.recurringRules.push({
      id: "rule-1",
      active: true,
      section: "vaste_kosten",
      subcategoryId: "sub-vast-wonen",
      party: "Woonfonds",
      description: "Huur",
      amountCents: 820_00,
      startYear: 2026,
      startMonth: 1,
      endYear: null,
      endMonth: null,
      maxCount: null,
      frequency: "monthly",
      pattern: "",
    });

    expect(subcategoryUsage(book, "sub-vast-wonen")).toEqual({ entries: 1, recurringRules: 1 });
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

  it("rejects invalid subcategory sort orders and duplicate names", () => {
    const book = createEmptyBook(2026);
    book.subcategories.push({
      id: "duplicate-name",
      section: "inkomsten",
      name: "Pensioen",
      sortOrder: 12.5,
    });

    expect(validateBook(book)).toEqual(
      expect.arrayContaining([
        "Subcategorie 'Pensioen' heeft een ongeldige volgorde.",
        "Dubbele subcategorie 'Pensioen' in inkomsten.",
      ]),
    );
  });
});
