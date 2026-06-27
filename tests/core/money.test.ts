import { describe, expect, it } from "vitest";
import { formatDecimal, formatMoney, parseMoney } from "../../src/core/money";

describe("parseMoney", () => {
  it.each([
    ["", 0],
    ["abc", 0],
    ["123", 123],
    ["123,45", 123.45],
    ["123.45", 123.45],
    ["1.234", 1234],
    ["1.234.567", 1234567],
    ["1,234", 1.234],
    ["1.234,56", 1234.56],
    ["1,234.56", 1234.56],
    ["€ 1.234,56", 1234.56],
    ["-12,50", -12.5],
  ])("parses %s", (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });
});

describe("formatMoney", () => {
  it("formats Belgian Dutch euros", () => {
    expect(formatMoney(1234.56)).toBe("€ 1.234,56");
  });

  it("keeps null decimal amounts blank", () => {
    expect(formatDecimal(null)).toBe("");
  });
});
