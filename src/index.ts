/**
 * tnd — Tunisian dinar (TND) helpers.
 *
 * The dinar is divided into 1000 millimes, so amounts have 3 decimals.
 * Internally every function works with integer millimes to avoid floating-point errors
 * (0.1 + 0.2 !== 0.3, but 100 + 200 === 300).
 */

export const MILLIMES_PER_DINAR = 1000;

export type FormatOptions = {
  /** "DT" (default), "TND", "د.ت" or "" for no symbol. */
  symbol?: string;
  /** Put the symbol before the amount ("TND 12,500") instead of after. */
  symbolFirst?: boolean;
  /** Always show 3 decimals (default), or drop ",000" on whole amounts. */
  decimals?: "always" | "auto";
  /** Thousands separator, default narrow no-break space (French typography). */
  groupSeparator?: string;
  /** Decimal separator, default ",". */
  decimalSeparator?: string;
};

/** Converts a dinar amount (number or numeric string) to integer millimes, rounding half away from zero. */
export function toMillimes(dinars: number | string): number {
  const value = typeof dinars === "string" ? Number(dinars) : dinars;
  if (!Number.isFinite(value)) throw new RangeError(`Not a finite amount: ${String(dinars)}`);
  // toFixed(3) on the absolute value avoids 1.0005 * 1000 = 1000.4999999 style errors.
  const [int, frac = ""] = Math.abs(value).toFixed(4).split(".");
  const millimes = Number(int) * MILLIMES_PER_DINAR + Math.round(Number(frac.padEnd(4, "0")) / 10);
  return value < 0 ? -millimes : millimes;
}

/** Converts integer millimes back to a dinar number (for display or APIs that need a float). */
export function toDinars(millimes: number): number {
  assertMillimes(millimes);
  return millimes / MILLIMES_PER_DINAR;
}

function assertMillimes(millimes: number): void {
  if (!Number.isSafeInteger(millimes)) throw new RangeError(`Millimes must be a safe integer, got ${millimes}`);
}

function group(digits: string, separator: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/**
 * Formats millimes as a price: formatMillimes(1234500) → "1 234,500 DT".
 * Uses a narrow no-break space so the amount never wraps across two lines.
 */
export function formatMillimes(millimes: number, options: FormatOptions = {}): string {
  assertMillimes(millimes);
  const {
    symbol = "DT",
    symbolFirst = false,
    decimals = "always",
    groupSeparator = " ",
    decimalSeparator = ",",
  } = options;

  const negative = millimes < 0;
  const abs = Math.abs(millimes);
  const whole = Math.floor(abs / MILLIMES_PER_DINAR);
  const rest = abs % MILLIMES_PER_DINAR;

  let text = group(String(whole), groupSeparator);
  if (decimals === "always" || rest !== 0) text += decimalSeparator + String(rest).padStart(3, "0");
  if (negative) text = `-${text}`;
  if (!symbol) return text;
  return symbolFirst ? `${symbol} ${text}` : `${text} ${symbol}`;
}

/** Same as formatMillimes, from a dinar amount: formatTND(49.9) → "49,900 DT". */
export function formatTND(dinars: number | string, options?: FormatOptions): string {
  return formatMillimes(toMillimes(dinars), options);
}

/**
 * Reads what a person typed and returns millimes, or null if it is not an amount.
 * Accepts "1 234,5", "1.234,500", "1,234.5", "12 DT", "TND 12", "12.5dt", "-3,2".
 */
export function parseTND(input: string): number | null {
  let text = input
    .trim()
    .replace(/^(tnd|dt|د\.ت)\s*/i, "")
    .replace(/\s*(tnd|dt|د\.ت|dinars?)$/i, "")
    .replace(/[\s  ']/g, "");
  if (!/^-?[\d.,]+$/.test(text)) return null;

  const negative = text.startsWith("-");
  if (negative) text = text.slice(1);

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  const decimalAt = Math.max(lastComma, lastDot);

  let intPart = text;
  let fracPart = "";
  if (decimalAt !== -1) {
    const separator = text[decimalAt];
    const after = text.slice(decimalAt + 1);
    // The last separator is the decimal one ("1.234,5", "1,234.5", "12,500" = 12.5 dinars), unless it
    // appears several times: then it only groups thousands ("1.234.567").
    const isGrouping = text.split(separator).length - 1 > 1;
    if (isGrouping) {
      intPart = text.split(separator).join("");
    } else {
      intPart = text.slice(0, decimalAt).split(/[.,]/).join("");
      fracPart = after;
    }
  }

  if (intPart === "" && fracPart === "") return null;
  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(fracPart)) return null;
  if (fracPart.length > 3) return null; // more precise than a millime

  const millimes = Number(intPart || "0") * MILLIMES_PER_DINAR + Number(fracPart.padEnd(3, "0") || "0");
  if (!Number.isSafeInteger(millimes)) return null;
  return negative ? -millimes : millimes;
}

// ---------------------------------------------------------------------------------------------
// Amount in words (French), as written on Tunisian invoices and cheques.
// ---------------------------------------------------------------------------------------------

const UNITS = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf",
];
const TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

/** 0–99. `final`: nothing follows, so "quatre-vingts" takes its s. */
function belowHundred(n: number, final: boolean): string {
  if (n < 20) return UNITS[n];
  const ten = Math.floor(n / 10);
  let unit = n % 10;
  if (ten === 7 || ten === 9) unit += 10; // soixante-dix, quatre-vingt-dix…
  const base = TENS[ten];
  if (unit === 0) return ten === 8 && final ? "quatre-vingts" : base;
  if (unit === 1 && ten !== 8 && ten !== 9) return `${base} et un`;
  if (unit === 11 && ten === 7) return `${base} et onze`;
  return `${base}-${UNITS[unit]}`;
}

/** 0–999. `final`: nothing follows (cents/quatre-vingts take an s only at the very end). */
function belowThousand(n: number, final: boolean): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds > 0) {
    const plural = hundreds > 1 && rest === 0 && final;
    parts.push(hundreds === 1 ? "cent" : `${UNITS[hundreds]} ${plural ? "cents" : "cent"}`);
  }
  if (rest > 0 || hundreds === 0) parts.push(belowHundred(rest, final));
  return parts.join(" ");
}

const SCALES: [number, string, string][] = [
  [1_000_000_000, "milliard", "milliards"],
  [1_000_000, "million", "millions"],
];

/** Whole number in French words: 1980 → "mille neuf cent quatre-vingt". */
export function numberToFrench(n: number): string {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(`Expected a positive integer, got ${n}`);
  if (n < 1000) return belowThousand(n, true);

  const parts: string[] = [];
  let rest = n;
  for (const [size, one, many] of SCALES) {
    const count = Math.floor(rest / size);
    if (count > 0) {
      // "millions" is a noun: "deux cents millions" keeps the s of cents.
      parts.push(`${numberToFrench(count)} ${count > 1 ? many : one}`);
      rest %= size;
    }
  }
  const thousands = Math.floor(rest / 1000);
  if (thousands > 0) {
    // "mille" is invariable and never preceded by "un"; "deux cent mille" (no s: mille is not a noun).
    parts.push(thousands === 1 ? "mille" : `${belowThousand(thousands, false)} mille`);
    rest %= 1000;
  }
  if (rest > 0) parts.push(belowThousand(rest, true));
  return parts.join(" ");
}

/**
 * Amount in words for invoices: amountInWords(1250500) →
 * "mille deux cent cinquante dinars et cinq cents millimes".
 */
export function amountInWords(millimes: number): string {
  assertMillimes(millimes);
  if (millimes < 0) return `moins ${amountInWords(-millimes)}`;
  const dinars = Math.floor(millimes / MILLIMES_PER_DINAR);
  const rest = millimes % MILLIMES_PER_DINAR;

  const dinarText =
    dinars === 0 ? "" : `${numberToFrench(dinars)} ${dinars > 1 ? "dinars" : "dinar"}`;
  const millimeText = rest === 0 ? "" : `${numberToFrench(rest)} ${rest > 1 ? "millimes" : "millime"}`;

  if (dinarText && millimeText) return `${dinarText} et ${millimeText}`;
  return dinarText || millimeText || "zéro dinar";
}

// ---------------------------------------------------------------------------------------------
// Money maths on millimes (no float drift).
// ---------------------------------------------------------------------------------------------

/** Adds amounts in millimes. */
export function sum(...millimes: number[]): number {
  return millimes.reduce((total, value) => {
    assertMillimes(value);
    return total + value;
  }, 0);
}

/** Applies a percentage (e.g. 19 for VAT, -15 for a discount), rounding to the nearest millime. */
export function applyPercent(millimes: number, percent: number): number {
  assertMillimes(millimes);
  const delta = (millimes * percent) / 100;
  return millimes + Math.sign(delta) * Math.round(Math.abs(delta));
}

/**
 * Splits an amount into `parts` instalments that add up exactly (the first ones get the extra millimes):
 * split(100000, 3) → [33334, 33333, 33333].
 */
export function split(millimes: number, parts: number): number[] {
  assertMillimes(millimes);
  if (!Number.isInteger(parts) || parts < 1) throw new RangeError(`parts must be a positive integer, got ${parts}`);
  const base = Math.trunc(millimes / parts);
  const extra = millimes - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < Math.abs(extra) ? Math.sign(extra) : 0));
}
