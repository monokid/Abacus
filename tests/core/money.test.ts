import { describe, expect, it } from "vitest";
import { formatDecimalCents, formatMoneyCents, parseMoneyToCents } from "../../src/core/money";

describe("parseMoneyToCents", () => {
  it.each([
    ["", 0],
    ["abc", 0],
    ["123", 12_300],
    ["123,45", 12_345],
    ["123.45", 12_345],
    ["1.234", 123_400],
    ["1.234.567", 123_456_700],
    ["1,234", 123],
    ["1,235", 124],
    ["1.234,56", 123_456],
    ["1,234.56", 123_456],
    ["\u20ac 1.234,56", 123_456],
    ["-12,50", -1_250],
  ])("parses %s", (input, expected) => {
    expect(parseMoneyToCents(input)).toBe(expected);
  });
});

describe("formatMoneyCents", () => {
  it("formats Belgian Dutch euros", () => {
    expect(formatMoneyCents(123_456)).toBe("\u20ac\u00a01.234,56");
  });

  it("keeps null decimal amounts blank", () => {
    expect(formatDecimalCents(null)).toBe("");
  });
});
