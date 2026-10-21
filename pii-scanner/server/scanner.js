/**
 * Runs every loaded pattern over the extracted text and decides which data
 * types are present, using the SupportEvidence settings from your XML:
 *
 *   keywordsPlusList  -> a nearby keyword raises confidence to "high"
 *   keywordsMinusList -> a nearby minus-keyword discards the match
 *   proximity         -> how many characters (or words, PROXIMITY_UNIT=words) either side count as "nearby"
 *   Enabled = 1       -> a plus-keyword nearby is REQUIRED, otherwise the match is dropped
 *
 * Confidence:
 *   high   - regex matched AND (checksum passed, or a plus-keyword is nearby)
 *   medium - regex matched, type has no keywords and no checksum
 *   low    - regex matched, type has keywords but none nearby
 * Keyword-only types are reported when >= minKeywordHits distinct keywords appear.
 */
const { validatorFor } = require('./validators');

const DEFAULTS = {
  maxMatchesPerType: 500,
  minKeywordHits: 2,
  minConfidence: 'low', // 'low' | 'medium' | 'high'
  proximityUnit: process.env.PROXIMITY_UNIT || 'chars', // 'chars' | 'words'
};
const RANK = { low: 0, medium: 1, high: 2 };

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
const mask = (v) => (v.length <= 4 ? '*'.repeat(v.length) : v.slice(0, 2) + '*'.repeat(Math.max(1, v.length - 4)) + v.slice(-2));

function keywordMatcher(keywords) {
  if (!keywords?.length) return null;
  const alts = [...keywords].sort((a, b) => b.length - a.length).map(escapeRe);
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alts.join('|')})(?![\\p{L}\\p{N}])`, 'giu');
}

/**
 * Text "near" the match. <proximity> is read as CHARACTERS by default (window is
 * widened to whole words so a keyword isn't cut in half). Set PROXIMITY_UNIT=words
 * if your DLP tool measures proximity in words.
 */
function nearbyText(lower, start, end, n, unit) {
  if (unit === 'words') {
    const reach = n * 25;
    const before = lower.slice(Math.max(0, start - reach), start).split(/\s+/).slice(-(n + 1)).join(' ');
    const after = lower.slice(end, end + reach).split(/\s+/).slice(0, n + 1).join(' ');
    return `${before} ${lower.slice(start, end)} ${after}`;
  }
  let a = Math.max(0, start - n);
  let b = Math.min(lower.length, end + n);
  while (a > 0 && !/\s/.test(lower[a - 1])) a--;
  while (b < lower.length && !/\s/.test(lower[b])) b++;
  return lower.slice(a, b);
}

const has = (re, s) => {
  if (!re) return false;
  re.lastIndex = 0;
  return re.test(s);
};

function scan(text, patterns, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const clean = text.replace(/ /g, ' ');
  const lower = clean.toLowerCase();
  const results = [];

  for (const p of patterns) {
    if (p._kw === undefined) p._kw = keywordMatcher(p.keywords);
    if (p._neg === undefined) p._neg = keywordMatcher(p.negKeywords);
    const validate = validatorFor(p.name);
    const proximity = p.proximityWords || 20;
    const meta = { type: p.name, description: p.description || '', riskLevel: p.riskLevel ?? null, regexSource: p.regexSource };

    // ---- keyword-only types ----
    if (!p.regexes.length) {
      if (!p._kw) continue;
      p._kw.lastIndex = 0;
      const hits = new Set((lower.match(p._kw) || []).map((h) => h.replace(/\s+/g, ' ')));
      if (hits.size >= opts.minKeywordHits && RANK.medium >= RANK[opts.minConfidence]) {
        results.push({ ...meta, kind: 'keywords', count: hits.size, confidence: 'medium', keywordsFound: [...hits].slice(0, 10), samples: [] });
      }
      continue;
    }

    // ---- regex types ----
    const seen = new Map();
    let rejectedByChecksum = 0;
    let rejectedByEvidence = 0;

    for (const { re } of p.regexes) {
      re.lastIndex = 0;
      let m;
      let n = 0;
      while ((m = re.exec(clean)) !== null) {
        if (m[0].length === 0) {
          re.lastIndex++;
          continue;
        }
        if (++n > opts.maxMatchesPerType) break;
        const value = m[0].trim();
        const start = m.index + m[0].indexOf(value);
        if (seen.has(start)) continue;

        let valid = false;
        if (validate) {
          if (!validate(value)) {
            rejectedByChecksum++;
            continue;
          }
          valid = true;
        }

        const win = p._kw || p._neg ? nearbyText(lower, start, start + value.length, proximity, opts.proximityUnit) : '';
        if (has(p._neg, win)) {
          rejectedByEvidence++;
          continue;
        }
        const nearKeyword = has(p._kw, win);
        if (p.requireKeyword && p._kw && !nearKeyword) {
          rejectedByEvidence++;
          continue;
        }

        const confidence = valid || nearKeyword ? 'high' : p._kw ? 'low' : 'medium';
        seen.set(start, { value, index: start, confidence, nearKeyword });
      }
    }

    const matches = [...seen.values()].filter((x) => RANK[x.confidence] >= RANK[opts.minConfidence]);
    if (!matches.length) continue;

    const best = matches.some((x) => x.confidence === 'high') ? 'high' : matches.some((x) => x.confidence === 'medium') ? 'medium' : 'low';
    results.push({
      ...meta,
      kind: 'regex',
      count: matches.length,
      confidence: best,
      checksum: validate ? 'passed' : 'n/a',
      rejectedByChecksum,
      rejectedByEvidence,
      samples: matches
        .sort((a, b) => RANK[b.confidence] - RANK[a.confidence])
        .slice(0, 5)
        .map((x) => ({ value: mask(x.value), index: x.index, confidence: x.confidence })),
    });
  }

  return results.sort((a, b) => RANK[b.confidence] - RANK[a.confidence] || (a.riskLevel ?? 99) - (b.riskLevel ?? 99) || b.count - a.count);
}

module.exports = { scan };
