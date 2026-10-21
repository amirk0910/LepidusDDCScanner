/**
 * Loads every *.xml file in a folder and turns it into a "pattern type":
 *
 *   { name, description, riskLevel, regexes: [{ source, re, engine }],
 *     regexSource: 'xml' | 'decrypted' | 'library' | 'none',
 *     keywords, negKeywords, proximityWords, requireKeyword, hasChecksum, errors }
 *
 * Your files look like:
 *   <pattern><name>Aadhar Card</name><type>Regular Expression</type>
 *     <searchfor>IJPbMbU6...</searchfor>            <- encrypted regex (AES, base64)
 *     <risklevel>1</risklevel><HasCheckSum>false</HasCheckSum>
 *     <SupportEvidence><Enabled>0</Enabled><proximity>20</proximity>
 *       <keywordsPlusList><keyword>Aadhaar Number</keyword>...</keywordsPlusList>
 *       <keywordsMinusList/></SupportEvidence></pattern>
 *
 * Because <searchfor> is encrypted, the regex comes from (in order):
 *   1. <searchfor> itself, if it is a plain-text regex
 *   2. ./decrypt.js, if you create one (export a function(searchfor) -> regex string)
 *   3. ./regexLibrary.js, looked up by <name>
 *   4. otherwise the type is detected by its keywords only
 */
const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
const { lookupRegexes } = require('./regexLibrary');

let RE2 = null;
try {
  RE2 = require('re2'); // linear-time engine, immune to ReDoS. Optional.
} catch {
  /* falls back to native RegExp */
}

let decrypt = null;
try {
  decrypt = require('./decrypt'); // optional, only if you get the key from the vendor
} catch {
  /* no decrypt hook */
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
  parseTagValue: false, // keep everything as strings
  parseAttributeValue: false,
  isArray: (tagName) => tagName === 'keyword', // a single <keyword> still comes back as an array
});

/** Your files are UTF-16 (BOM FF FE). Reading them as UTF-8 gives garbage. */
function readXml(file) {
  const buf = fs.readFileSync(file);
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.toString('utf16le').replace(/^﻿/, '');
  if (buf[0] === 0xfe && buf[1] === 0xff) return Buffer.from(buf).swap16().toString('utf16le').replace(/^﻿/, '');
  if (buf.length > 1 && buf[1] === 0x00) return buf.toString('utf16le'); // UTF-16LE without BOM
  return buf.toString('utf8').replace(/^﻿/, '');
}

/** base64 whose decoded length is a multiple of 16 bytes = block-cipher output, not a regex */
function looksEncrypted(s) {
  if (s.length < 24 || s.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(s)) return false;
  return Buffer.from(s, 'base64').length % 16 === 0;
}

/** Converts PCRE / .NET style regex syntax that JavaScript doesn't understand. */
function normalise(source) {
  let src = source;
  let flags = 'g';
  const inline = src.match(/^\(\?([imsx]+)\)/);
  if (inline) {
    src = src.slice(inline[0].length);
    if (inline[1].includes('i')) flags += 'i';
    if (inline[1].includes('m')) flags += 'm';
    if (inline[1].includes('s')) flags += 's';
    if (inline[1].includes('x')) src = src.replace(/\\#/g, '\u0000').replace(/#.*$/gm, '').replace(/\s+/g, '').replace(/\u0000/g, '\\#');
  }
  src = src
    .replace(/\(\?P</g, '(?<')
    .replace(/\(\?>/g, '(?:')
    .replace(/(?<!\\)([*+?}])\+/g, '$1')
    .replace(/\\A/g, '^')
    .replace(/\\[Zz]/g, '$');
  return { src, flags };
}

function compile(source) {
  const { src, flags } = normalise(source);
  if (RE2) {
    try {
      return { source, re: new RE2(src, flags), engine: 're2' };
    } catch {
      /* RE2 has no lookarounds/backrefs -> try native */
    }
  }
  return { source, re: new RegExp(src, flags), engine: 'native' };
}

const list = (x) =>
  (x == null || x === '' ? [] : Array.isArray(x) ? x : [x])
    .map((v) => (typeof v === 'object' ? v['#text'] : v))
    .map((v) => String(v ?? '').trim())
    .filter(Boolean);

/** Your vendor format: <pattern><name>…<searchfor>…<SupportEvidence>… */
function fromVendorXml(node, fileName) {
  const se = node.SupportEvidence || {};
  const p = {
    name: String(node.name || fileName).trim(),
    file: fileName,
    description: String(node.description || ''),
    matchType: String(node.type || ''),
    riskLevel: Number(node.risklevel) || null,
    hasChecksum: /true/i.test(String(node.HasCheckSum)),
    requireKeyword: String(se.Enabled) === '1',
    proximityWords: parseInt(se.proximity, 10) || 20,
    keywords: list(se.keywordsPlusList?.keyword).map((k) => k.toLowerCase()),
    negKeywords: list(se.keywordsMinusList?.keyword).map((k) => k.toLowerCase()),
    rawRegexes: [],
    regexSource: 'none',
  };

  const searchfor = String(node.searchfor || '').trim();
  if (searchfor && !looksEncrypted(searchfor)) {
    if (/regular/i.test(p.matchType)) {
      p.rawRegexes = [searchfor];
      p.regexSource = 'xml';
    } else {
      p.keywords.push(...searchfor.split(/[\r\n,;|]+/).map((s) => s.trim().toLowerCase()).filter(Boolean));
    }
  } else if (searchfor && decrypt) {
    const plain = decrypt(searchfor, p);
    if (plain) {
      p.rawRegexes = [plain];
      p.regexSource = 'decrypted';
    }
  }
  if (!p.rawRegexes.length) {
    const lib = lookupRegexes(p.name);
    if (lib.length) {
      p.rawRegexes = lib;
      p.regexSource = 'library';
    }
  }
  return p;
}

/** Fallback for any other XML layout: grab tags named Regex/Pattern and Keyword/Term. */
const REGEX_KEY = /^(regex|regexp|regexpattern|expression|regularexpression)$/i;
const KEYWORD_KEY = /^(keyword|keywords|term|terms|word|words|phrase|phrases)$/i;
function collect(node, key, out) {
  if (node == null) return;
  if (Array.isArray(node)) return node.forEach((n) => collect(n, key, out));
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) collect(v, k === '#text' ? key : k.replace(/^@_/, ''), out);
    return;
  }
  const value = String(node).trim();
  if (!value) return;
  if (REGEX_KEY.test(key)) out.regexes.push(value);
  else if (KEYWORD_KEY.test(key)) out.keywords.push(...value.split(/[\r\n,;|]+/).map((s) => s.trim().toLowerCase()).filter(Boolean));
}
function fromGenericXml(tree, fileName) {
  const raw = { regexes: [], keywords: [] };
  collect(tree, '', raw);
  const lib = raw.regexes.length ? [] : lookupRegexes(fileName);
  return {
    name: fileName,
    file: fileName,
    description: '',
    riskLevel: null,
    hasChecksum: false,
    requireKeyword: false,
    proximityWords: 20,
    keywords: raw.keywords,
    negKeywords: [],
    rawRegexes: raw.regexes.length ? raw.regexes : lib,
    regexSource: raw.regexes.length ? 'xml' : lib.length ? 'library' : 'none',
  };
}

function loadPatterns(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.xml'));
  const patterns = [];

  for (const file of files) {
    const fileName = path.basename(file, path.extname(file)).trim();
    let p;
    try {
      const tree = parser.parse(readXml(path.join(dir, file)));
      p = tree.pattern?.searchfor !== undefined || tree.pattern?.SupportEvidence ? fromVendorXml(tree.pattern, fileName) : fromGenericXml(tree, fileName);
    } catch (e) {
      patterns.push({ name: fileName, file, regexes: [], keywords: [], negKeywords: [], errors: [`Could not parse XML: ${e.message}`], regexSource: 'none' });
      continue;
    }

    p.errors = [];
    p.regexes = [];
    for (const r of [...new Set(p.rawRegexes)]) {
      try {
        p.regexes.push(compile(r));
      } catch (e) {
        p.errors.push(`Invalid regex "${r}": ${e.message}`);
      }
    }
    delete p.rawRegexes;
    p.keywords = [...new Set(p.keywords)];
    p.negKeywords = [...new Set(p.negKeywords)];
    if (!p.regexes.length && !p.keywords.length) p.errors.push('No usable regex or keywords');
    patterns.push(p);
  }

  const by = (s) => patterns.filter((p) => p.regexSource === s).length;
  console.log(
    `Loaded ${patterns.length} types | regex from XML: ${by('xml')}, decrypted: ${by('decrypted')}, library: ${by('library')}, keyword-only: ${by('none')} | RE2: ${RE2 ? 'on' : 'off'}`
  );
  patterns.filter((p) => p.errors.length).forEach((p) => console.warn(`  ! ${p.file}: ${p.errors.join(' | ')}`));
  return patterns;
}

module.exports = { loadPatterns, compile, looksEncrypted, readXml };
