import { describe, expect, it } from "vitest";
import {
  amountInWords,
  applyPercent,
  formatMillimes,
  formatTND,
  numberToFrench,
  parseTND,
  split,
  sum,
  toDinars,
  toMillimes,
} from "../src/index";

const NNBSP = " ";
const NBSP = " ";

describe("toMillimes / toDinars", () => {
  it("converts without float drift", () => {
    expect(toMillimes(0.1) + toMillimes(0.2)).toBe(toMillimes(0.3));
    expect(toMillimes(1.0005)).toBe(1001);
    expect(toMillimes("49.9")).toBe(49900);
    expect(toMillimes(-2.5)).toBe(-2500);
    expect(toDinars(1234500)).toBe(1234.5);
  });

  it("rejects non-numbers", () => {
    expect(() => toMillimes("abc")).toThrow(RangeError);
    expect(() => toMillimes(Number.NaN)).toThrow(RangeError);
  });
});

describe("formatMillimes / formatTND", () => {
  it("formats with 3 decimals and French grouping", () => {
    expect(formatMillimes(1234500)).toBe(`1${NNBSP}234,500${NBSP}DT`);
    expect(formatTND(49.9)).toBe(`49,900${NBSP}DT`);
    expect(formatTND(0)).toBe(`0,000${NBSP}DT`);
    expect(formatTND(-12.05)).toBe(`-12,050${NBSP}DT`);
  });

  it("supports options", () => {
    expect(formatTND(1200, { decimals: "auto" })).toBe(`1${NNBSP}200${NBSP}DT`);
    expect(formatTND(1200.5, { decimals: "auto" })).toBe(`1${NNBSP}200,500${NBSP}DT`);
    expect(formatTND(15, { symbol: "TND", symbolFirst: true })).toBe(`TND${NBSP}15,000`);
    expect(formatTND(1500, { symbol: "", groupSeparator: ".", decimalSeparator: "," })).toBe("1.500,000");
  });
});

describe("parseTND", () => {
  it.each([
    ["12", 12000],
    ["12,5", 12500],
    ["12,500", 12500],
    ["12.5", 12500],
    ["1 234,5", 1234500],
    ["1.234,500", 1234500],
    ["1,234.5", 1234500],
    ["1.234.567", 1234567000],
    ["12 DT", 12000],
    ["12.5dt", 12500],
    ["TND 7", 7000],
    ["3 dinars", 3000],
    ["-3,2", -3200],
    [",5", 500],
  ])("%s → %i millimes", (input, expected) => {
    expect(parseTND(input)).toBe(expected);
  });

  it.each(["", "abc", "12,5000", "1-2", "DT", "1,2.3.4"])("rejects %j", (input) => {
    expect(parseTND(input)).toBeNull();
  });
});

describe("numberToFrench", () => {
  it.each([
    [0, "zéro"],
    [1, "un"],
    [16, "seize"],
    [17, "dix-sept"],
    [21, "vingt et un"],
    [22, "vingt-deux"],
    [71, "soixante et onze"],
    [77, "soixante-dix-sept"],
    [80, "quatre-vingts"],
    [81, "quatre-vingt-un"],
    [91, "quatre-vingt-onze"],
    [99, "quatre-vingt-dix-neuf"],
    [100, "cent"],
    [101, "cent un"],
    [200, "deux cents"],
    [201, "deux cent un"],
    [280, "deux cent quatre-vingts"],
    [1000, "mille"],
    [1001, "mille un"],
    [1980, "mille neuf cent quatre-vingts"],
    [2000, "deux mille"],
    [80000, "quatre-vingt mille"],
    [200000, "deux cent mille"],
    [1000000, "un million"],
    [2500000, "deux millions cinq cent mille"],
    [200000000, "deux cents millions"],
    [1000000000, "un milliard"],
  ])("%i → %s", (n, words) => {
    expect(numberToFrench(n)).toBe(words);
  });
});

describe("amountInWords", () => {
  it("writes dinars and millimes", () => {
    expect(amountInWords(1250500)).toBe("mille deux cent cinquante dinars et cinq cents millimes");
    expect(amountInWords(1000)).toBe("un dinar");
    expect(amountInWords(1)).toBe("un millime");
    expect(amountInWords(0)).toBe("zéro dinar");
    expect(amountInWords(-2000)).toBe("moins deux dinars");
  });
});

describe("money maths", () => {
  it("sums, applies percentages and splits exactly", () => {
    expect(sum(100, 200, 300)).toBe(600);
    expect(applyPercent(100000, 19)).toBe(119000);
    expect(applyPercent(49900, -15)).toBe(42415);
    expect(applyPercent(333, 50)).toBe(500); // 166.5 → 167
    expect(split(100000, 3)).toEqual([33334, 33333, 33333]);
    expect(split(-100000, 3)).toEqual([-33334, -33333, -33333]);
    expect(split(100000, 3).reduce((a, b) => a + b, 0)).toBe(100000);
  });

  it("refuses fractional millimes", () => {
    expect(() => sum(0.5)).toThrow(RangeError);
    expect(() => split(100, 0)).toThrow(RangeError);
  });
});
