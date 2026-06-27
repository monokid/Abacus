const moneyFormatter = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
});

const decimalFormatter = new Intl.NumberFormat("nl-BE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function parseMoney(input: unknown): number {
  let text = String(input ?? "").replace(/[€\s]/g, "");
  if (!text) return 0;

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    text = lastComma > lastDot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  } else if (lastComma >= 0) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (lastDot >= 0) {
    const parts = text.split(".");
    const lastPart = parts.at(-1) ?? "";
    if (parts.length > 1 && lastPart.length === 3) {
      text = text.replace(/\./g, "");
    }
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatMoney(value: number): string {
  return moneyFormatter.format(value);
}

export function formatDecimal(value: number | null): string {
  return value === null ? "" : decimalFormatter.format(value);
}
