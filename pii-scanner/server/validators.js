/**
 * Checksum validators. A regex only checks the *shape* of a value; these check
 * that the number is actually valid, which removes most false positives.
 * Each rule is matched against the pattern's name (the XML file name).
 */
const digits = (s) => s.replace(/\D/g, '');

function luhn(value) {
  const d = digits(value);
  if (d.length < 8 || d.length > 19) return false;
  let sum = 0;
  let dbl = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = +d[i];
    if (dbl) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

// Verhoeff - used by Aadhaar
const VD = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VP = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
function verhoeff(value) {
  const d = digits(value);
  let c = 0;
  [...d].reverse().forEach((ch, i) => (c = VD[c][VP[i % 8][+ch]]));
  return c === 0;
}
const aadhaar = (v) => {
  const d = digits(v);
  return d.length === 12 && !/^[01]/.test(d) && verhoeff(d);
};

function iban(value) {
  const s = value.replace(/[\s-]/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const rearranged = s.slice(4) + s.slice(0, 4);
  let rem = 0;
  for (const ch of rearranged) {
    const n = ch >= 'A' ? (ch.charCodeAt(0) - 55).toString() : ch;
    for (const x of n) rem = (rem * 10 + +x) % 97;
  }
  return rem === 1;
}

function aba(value) {
  const d = digits(value);
  if (d.length !== 9) return false;
  const n = [...d].map(Number);
  return (3 * (n[0] + n[3] + n[6]) + 7 * (n[1] + n[4] + n[7]) + (n[2] + n[5] + n[8])) % 10 === 0;
}

function nhs(value) {
  const d = digits(value);
  if (d.length !== 10) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += +d[i] * (10 - i);
  let check = 11 - (sum % 11);
  if (check === 11) check = 0;
  return check !== 10 && check === +d[9];
}

const ssn = (v) => /^(?!000|666|9)\d{3}(?!00)\d{2}(?!0000)\d{4}$/.test(digits(v));

const panIndia = (v) => /^[A-Z]{3}[PCHFATBLJG][A-Z]\d{4}[A-Z]$/.test(v.toUpperCase().replace(/\s/g, ''));

// US NPI: Luhn over "80840" + the 10 digits
const npi = (v) => {
  const d = digits(v);
  return d.length === 10 && luhn('80840' + d);
};

// US DEA: 2 letters + 7 digits, (d1+d3+d5 + 2*(d2+d4+d6)) % 10 === d7
const dea = (v) => {
  const m = v.toUpperCase().match(/^[A-Z][A-Z9](\d{7})$/);
  if (!m) return false;
  const n = [...m[1]].map(Number);
  return (n[0] + n[2] + n[4] + 2 * (n[1] + n[3] + n[5])) % 10 === n[6];
};

// Australian TFN (8 or 9 digits, weighted mod 11)
const tfn = (v) => {
  const d = digits(v);
  const w = d.length === 9 ? [1, 4, 3, 7, 5, 8, 6, 9, 10] : d.length === 8 ? [10, 7, 8, 4, 6, 3, 5, 1] : null;
  return !!w && [...d].reduce((s, x, i) => s + +x * w[i], 0) % 11 === 0;
};

// Australian Medicare: first 8 digits weighted 1,3,7,9 -> mod 10 = 9th digit
const medicareAU = (v) => {
  const d = digits(v);
  if (d.length < 10 || d.length > 11 || !/^[2-6]/.test(d)) return false;
  const w = [1, 3, 7, 9, 1, 3, 7, 9];
  return w.reduce((s, x, i) => s + x * +d[i], 0) % 10 === +d[8];
};

// Brazil CPF
const cpf = (v) => {
  const d = digits(v);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const check = (len) => {
    const s = [...d.slice(0, len)].reduce((a, x, i) => a + +x * (len + 1 - i), 0);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return check(9) === +d[9] && check(10) === +d[10];
};

// Brazil CNPJ
const cnpj = (v) => {
  const d = digits(v);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (len) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = [...d.slice(0, len)].reduce((a, x, i) => a + +x * w[i], 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === +d[12] && calc(13) === +d[13];
};

// Spain DNI / NIE control letter
const dni = (v) => {
  let s = v.toUpperCase().replace(/[\s-]/g, '');
  s = s.replace(/^X/, '0').replace(/^Y/, '1').replace(/^Z/, '2');
  const m = s.match(/^(\d{8})([A-Z])$/);
  return !!m && 'TRWAGMYFPDXBNJZSQVHLCKE'[+m[1] % 23] === m[2];
};

// Chile RUT/RUN (mod 11)
const rut = (v) => {
  const s = v.toUpperCase().replace(/[.\s]/g, '');
  const m = s.match(/^(\d{7,8})-?([\dK])$/);
  if (!m) return false;
  let sum = 0;
  let mul = 2;
  for (const ch of [...m[1]].reverse()) {
    sum += +ch * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const r = 11 - (sum % 11);
  const expected = r === 11 ? '0' : r === 10 ? 'K' : String(r);
  return expected === m[2];
};

const RULES = [
  [/^credit card - (?!enroute)|^card\s*-|charge card|canada social insurance|south african id/i, luhn],
  [/aadha?ar/i, aadhaar],
  [/iban/i, iban],
  [/aba routing/i, aba],
  [/uk nhs/i, nhs],
  [/^ssn usa$/i, ssn],
  [/^pan india$/i, panIndia],
  [/national provider/i, npi],
  [/^dea number$/i, dea],
  [/tax file number/i, tfn],
  [/australian medicare/i, medicareAU],
  [/^cpf/i, cpf],
  [/^cnpj/i, cnpj],
  [/documento nacional de identidad|numero de identificacion fiscal/i, dni],
  [/chile identification/i, rut],
];

function validatorFor(patternName) {
  const rule = RULES.find(([re]) => re.test(patternName));
  return rule ? rule[1] : null;
}

module.exports = { validatorFor, luhn, verhoeff, aadhaar, iban, aba, nhs, ssn, panIndia, npi, dea, tfn, medicareAU, cpf, cnpj, dni, rut };
