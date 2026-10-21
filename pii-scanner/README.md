# Sensitive Data Scanner (React + Node)

Upload a file → the server extracts its text → checks it against every data type
defined in your XML pattern files → returns which types (Aadhaar, PAN, Visa,
IBAN, SSN …) the file contains, with a confidence level, risk level and masked
examples.

```
pii-scanner/
├─ server/
│  ├─ patterns/          ← put ALL your .xml pattern files here (UTF-16 is fine)
│  ├─ patternLoader.js   reads your XML format (name, keywords, proximity, …)
│  ├─ regexLibrary.js    the regex for each type, looked up by <name>
│  ├─ validators.js      checksums: Luhn, Verhoeff, IBAN, ABA, NHS, SSN, PAN,
│  │                     NPI, DEA, TFN, AU Medicare, CPF, CNPJ, DNI/NIE, RUT
│  ├─ scanner.js         matching, keyword evidence, confidence scoring
│  ├─ textExtractor.js   PDF / DOCX / XLSX / CSV / TXT → text
│  ├─ index.js           Express API
│  └─ cli.js             command-line test
├─ client/               React (Vite) upload UI
└─ samples/              test files (txt, pdf, docx, xlsx)
```

## Run it

```bash
# 1. backend
cd server
npm install
# delete the sample XMLs in server/patterns/ and copy in all of yours
npm start                      # http://localhost:5000

# 2. frontend (new terminal)
cd client
npm install
npm run dev                    # http://localhost:5173
```

Quick test without the UI: `cd server && node cli.js ../samples/sample.pdf`

On startup the server prints a summary like
`Loaded 221 types | regex from XML: 0, decrypted: 0, library: 203, keyword-only: 18`.

Production: `cd client && npm run build`, then `npm start` in `server/` serves the
built UI and API together on port 5000.

## Your XML format — and why the regex comes from regexLibrary.js

```xml
<pattern><name>Aadhar Card</name><type>Regular Expression</type>
  <searchfor>IJPbMbU6Kn6EimYmDrMme0iYHDKOB9c2cVt95uQsfJXt+vfI0VCd3tVKKMSlD3IR</searchfor>
  <risklevel>1</risklevel><description>Aadhar number in India</description>
  <HasCheckSum>false</HasCheckSum>
  <SupportEvidence><Enabled>0</Enabled><proximity>20</proximity>
    <keywordsPlusList><keyword>Aadhaar Number</keyword>…</keywordsPlusList>
    <keywordsMinusList /></SupportEvidence></pattern>
```

`<searchfor>` is **encrypted**: it's base64 that decodes to 48 random-looking
bytes (exactly 3 × 16-byte cipher blocks). It cannot be used as a regex without
the key from the DLP product that exported it. So the regex for each type is
resolved in this order:

1. `<searchfor>` itself, if a file ever contains a plain-text regex
2. `server/decrypt.js`, if you create one — export
   `module.exports = (searchfor, pattern) => 'the plain regex' | null`
   (only possible if the vendor gives you the key/algorithm, or an unencrypted export)
3. `server/regexLibrary.js`, looked up by `<name>` (covers 203 of your types)
4. otherwise the type is detected by its keywords only (CCPA *, Illness,
   Bank Statement, Loan Application, Employment History, Gift Card, …)

Everything else in the XML **is** used:

| XML field | What the scanner does with it |
|---|---|
| `name`, `description`, `risklevel` | shown in results; results sorted by confidence, then risk |
| `keywordsPlusList` | keyword near a match → confidence **high** |
| `keywordsMinusList` | minus-keyword near a match → match discarded |
| `proximity` | how close "near" is — **characters** by default; run with `PROXIMITY_UNIT=words` if your tool meant words |
| `SupportEvidence/Enabled = 1` | a plus-keyword nearby is **required**, otherwise the match is discarded |
| `HasCheckSum` | informational; checksums run whenever `validators.js` has one for the type |

## API

| Method | Path | Notes |
|---|---|---|
| GET  | `/api/patterns` | every type with its regex source, keyword counts and any errors |
| POST | `/api/patterns/reload` | re-read the patterns folder without restarting |
| POST | `/api/scan` | multipart form, field `files` (up to 10), optional `minConfidence` = low/medium/high |

Example response:

```json
[{ "file": "kyc.pdf", "characters": 4210, "detected": [
  { "type": "Aadhar Card", "riskLevel": 1, "count": 1, "confidence": "high",
    "checksum": "passed", "rejectedByChecksum": 3, "rejectedByEvidence": 0,
    "samples": [{ "value": "23**********24", "confidence": "high" }] },
  { "type": "Bank Statement", "kind": "keywords", "count": 5, "confidence": "medium",
    "keywordsFound": ["opening balance", "closing balance", "..."] }
]}]
```

## Confidence

- **high** — regex matched and (checksum passed, or a plus-keyword is nearby)
- **medium** — regex matched; the type has no keywords and no checksum (e.g. Email)
- **low** — regex matched; the type has keywords but none nearby (often a false positive)
- keyword-only types are reported (medium) when ≥ 2 distinct keywords appear

## Notes

- Your files are UTF-16 (BOM `FF FE`); the loader detects and decodes that.
- Regexes run on **RE2** (linear time, no ReDoS). Patterns RE2 can't handle
  (lookarounds) fall back to native `RegExp` automatically.
- Many ID formats are "N digits" (driver's licences, bank accounts, passports).
  Those depend on your keywords — set `minConfidence=high` in the UI to see only
  keyword- or checksum-confirmed matches.
- Files are kept in memory only (never written to disk). Only masked values are
  returned to the browser.
- **Scanned PDFs / images** have no text layer. Add OCR with `tesseract.js` in
  `textExtractor.js`.
- For big files or many uploads, move `scan()` into a `worker_threads` worker.
