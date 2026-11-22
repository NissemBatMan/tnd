# tnd

[![CI](https://github.com/NissemBatMan/tnd/actions/workflows/ci.yml/badge.svg)](https://github.com/NissemBatMan/tnd/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

**Tunisian dinar (TND) helpers for JavaScript and TypeScript.**
Exact money maths in millimes, price formatting, parsing what people type, and amounts in French words for invoices.

The dinar has **1000 millimes**, so prices have **3 decimals**, and floats get them wrong
(`0.1 + 0.2 = 0.30000000000000004`). `tnd` works with integer millimes everywhere.

## Install

```bash
npm install github:NissemBatMan/tnd
```

## Usage

```ts
import { formatTND, parseTND, amountInWords, applyPercent, split, toMillimes } from "tnd";

formatTND(1234.5);                     // "1 234,500 DT"
formatTND(1200, { decimals: "auto" }); // "1 200 DT"
formatTND(15, { symbol: "TND", symbolFirst: true }); // "TND 15,000"

parseTND("1 234,5 DT"); // 1234500 (millimes)
parseTND("1.234,500");  // 1234500
parseTND("12,500");     // 12500  → in Tunisia the comma is the decimal separator
parseTND("abc");        // null

amountInWords(1250500);
// "mille deux cent cinquante dinars et cinq cents millimes"

const price = toMillimes(49.9);   // 49900
applyPercent(price, 19);          // 59381  → +19 % VAT
applyPercent(price, -15);         // 42415  → 15 % discount
split(100000, 3);                 // [33334, 33333, 33333] → instalments that add up exactly
```

## API

| Function | Description |
| --- | --- |
| `toMillimes(dinars)` | `49.9` or `"49.9"` → `49900`. Rounds half away from zero, throws on non-numbers. |
| `toDinars(millimes)` | `49900` → `49.9` |
| `formatMillimes(millimes, options?)` | Price text with 3 decimals, French grouping and a non-breaking space before the symbol. |
| `formatTND(dinars, options?)` | Same, from a dinar amount. |
| `parseTND(text)` | Reads `"1 234,5"`, `"1.234,500"`, `"1,234.5"`, `"12 DT"`, `"TND 7"`… → millimes, or `null`. |
| `amountInWords(millimes)` | Amount in French words, following French spelling rules (*vingt et un*, *quatre-vingts*, *deux cents*, *deux cent mille*…). |
| `numberToFrench(n)` | Whole number in French words. |
| `sum(...millimes)` | Adds amounts, refuses fractional millimes. |
| `applyPercent(millimes, percent)` | VAT, discounts, fees, rounded to the nearest millime. |
| `split(millimes, parts)` | Splits into instalments whose total is exactly the original amount. |

### Format options

| Option | Default | |
| --- | --- | --- |
| `symbol` | `"DT"` | `"TND"`, `"د.ت"` or `""` |
| `symbolFirst` | `false` | `TND 12,000` instead of `12,000 DT` |
| `decimals` | `"always"` | `"auto"` drops `,000` on whole amounts |
| `groupSeparator` | narrow no-break space | e.g. `"."` |
| `decimalSeparator` | `","` | e.g. `"."` |

## Development

```bash
npm install
npm test          # 54 tests (Vitest)
npm run typecheck
npm run build     # dist/ with type declarations
```

## License

MIT © Nissem
