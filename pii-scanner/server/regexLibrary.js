/**
 * Regexes for each data type, keyed by the <name> in your XML files.
 * Used because <searchfor> in the XML is encrypted.
 *
 * Names are matched loosely (case, spaces and punctuation ignored), so
 * "Card -Chase" and "Card - Chase" both match.
 *
 * Many ID formats are just "N digits" and will match lots of unrelated numbers.
 * That's expected: the keywords/proximity from your XML and the checksum
 * validators in validators.js decide the confidence. Types missing from this
 * list (CCPA *, Illness, Bank Statement, Loan Application, ...) are detected
 * by keywords only.
 *
 * Tune these to your data — they are a solid starting point, not gospel.
 */
const r = String.raw;

const CARD_ANY = r`\b(?:4\d{3}|5[1-5]\d{2}|2(?:22[1-9]|2[3-9]\d|[3-6]\d{2}|7[01]\d|720))(?:[ -]?\d{4}){3}\b`;

const LIBRARY = {
  // ---------- India ----------
  'Aadhar Card': [r`\b[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}\b`],
  'PAN India': [r`\b[A-Z]{3}[PCHFATBLJG][A-Z]\d{4}[A-Z]\b`],

  // ---------- Payment cards ----------
  'Credit Card - Visa': [r`\b4\d{3}(?:[ -]?\d{4}){3}\b`, r`\b4\d{12}(?:\d{3})?\b`],
  'Credit Card - Master': [r`\b(?:5[1-5]\d{2}|2(?:22[1-9]|2[3-9]\d|[3-6]\d{2}|7[01]\d|720))(?:[ -]?\d{4}){3}\b`],
  'Credit Card - Amex Card': [r`\b3[47]\d{2}[ -]?\d{6}[ -]?\d{5}\b`],
  'Credit Card - Discover': [r`\b6(?:011|5\d{2}|4[4-9]\d)(?:[ -]?\d{4}){3}\b`],
  'Credit Card - Diners Club': [r`\b3(?:0[0-5]|[68]\d)\d[ -]?\d{6}[ -]?\d{4}\b`],
  'Credit Card - JCB': [r`\b35(?:2[89]|[3-8]\d)(?:[ -]?\d{4}){3}\b`],
  'Credit Card - China Union Pay': [r`\b62\d{2}(?:[ -]?\d{4}){3}(?:\d{1,3})?\b`],
  'Credit Card - MIR': [r`\b220[0-4](?:[ -]?\d{4}){3}\b`],
  'Credit Card - Dankort': [r`\b5019(?:[ -]?\d{4}){3}\b`],
  'Credit Card - Enroute': [r`\b(?:2014|2149)[ -]?\d{7}[ -]?\d{4}\b`],
  'Credit Card - Laser': [r`\b(?:6304|6706|6709|6771)\d{8,15}\b`],
  'Credit Card - Instapay': [r`\b63[7-9]\d(?:[ -]?\d{4}){3}\b`],
  'Charge Card - UATP': [r`\b1\d{3}[ -]?\d{5}[ -]?\d{6}\b`],
  'Card -Chase': [CARD_ANY],
  'Card -Monese': [CARD_ANY],
  'Card -Monzo': [CARD_ANY],
  'Card -Revolut': [CARD_ANY],
  'Card -Starling': [CARD_ANY],
  'Card -Virgin': [CARD_ANY],

  // ---------- Gift cards ----------
  'Gift Card-Amazon': [r`\b[A-Z0-9]{4}-[A-Z0-9]{6}-[A-Z0-9]{4,5}\b`],
  'Gift Card-Google Play': [r`\b[A-Z0-9]{4}(?:[ -]?[A-Z0-9]{4}){4}\b`],
  'Gift Card-Microsoft': [r`\b[A-Z0-9]{5}(?:-[A-Z0-9]{5}){4}\b`],
  'Gift Card-Steam': [r`\b[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}\b`],
  'Gift Card-Nike': [r`\b\d{19}\b`],

  // ---------- Banking ----------
  'ABA Routing Number': [r`\b[0-3]\d{8}\b`],
  'US Bank Account Number': [r`\b\d{8,17}\b`],
  'UK Bank Account Number': [r`\b\d{8}\b`],
  'UK Bank Sort Code': [r`\b\d{2}-\d{2}-\d{2}\b`],
  'Australian Bank Account Number': [r`\b\d{6,10}\b`],
  'Bank State Branch (BSB) code': [r`\b\d{3}-\d{3}\b`],
  'SWIFT Code': [r`\b[A-Z]{4}(?:AD|AE|AU|BE|BR|CA|CH|CN|DE|DK|ES|FI|FR|GB|HK|IE|IN|IT|JP|MY|NL|NO|PT|SA|SE|SG|TW|US|ZA)[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b`],
  'German IBAN': [r`\bDE\d{2}(?:\s?\d{4}){4}\s?\d{2}\b`],
  'Spain IBAN': [r`\bES\d{2}(?:\s?\d{4}){5}\b`],
  'Sweden IBAN': [r`\bSE\d{2}(?:\s?\d{4}){5}\b`],
  'Switzerland IBAN': [r`\bCH\d{2}(?:\s?[0-9A-Z]{4}){4}\s?[0-9A-Z]\b`],
  'UK IBAN': [r`\bGB\d{2}\s?[A-Z]{4}(?:\s?\d{4}){3}\s?\d{2}\b`],
  'Account Balance': [r`(?:₹|\$|£|€|\bINR|\bUSD|\bGBP|\bEUR|\bRs\.?)\s?\d{1,3}(?:,\d{2,3})*(?:\.\d{2})?`],

  // ---------- Generic ----------
  Email: [r`\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b`],
  URL: [r`\bhttps?://[^\s"'<>]+`, r`\bwww\.[^\s"'<>]+`],
  IPv4: [r`\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b`],
  IPv6: [r`\b(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}\b`, r`\b(?:[A-Fa-f0-9]{1,4}:){1,6}:(?:[A-Fa-f0-9]{1,4}:){0,5}[A-Fa-f0-9]{1,4}\b`],
  'File Path': [r`\b[A-Za-z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n\s]*`, r`(?:^|\s)(?:/[\w.-]+){2,}`],
  'Date mmddyyyy format': [r`\b(?:0[1-9]|1[0-2])[/.-](?:0[1-9]|[12]\d|3[01])[/.-](?:19|20)\d{2}\b`],

  // ---------- USA ----------
  'SSN USA': [r`\b\d{3}[- ]\d{2}[- ]\d{4}\b`],
  'US Taxpayer Id Number (ITIN)': [r`\b9\d{2}[- ]?(?:5\d|6[0-5]|7\d|8[0-8]|9[0-2]|9[4-9])[- ]?\d{4}\b`],
  'US EIN (Employer Identification Number)': [r`\b\d{2}-\d{7}\b`],
  'US Passport Number': [r`\b(?:[A-Z]\d{8}|\d{9})\b`],
  'US Phone Number': [r`(?:\+?1[ .-]?)?\(?\b[2-9]\d{2}\)?[ .-]?[2-9]\d{2}[ .-]?\d{4}\b`],
  'US Zip code': [r`\b\d{5}(?:-\d{4})?\b`],
  'US Medical Insurance Number (Medicare Number)': [r`\b[1-9][AC-HJKMNP-RT-Y][AC-HJKMNP-RT-Y0-9]\d-?[AC-HJKMNP-RT-Y][AC-HJKMNP-RT-Y0-9]\d-?[AC-HJKMNP-RT-Y]{2}\d{2}\b`],
  'US National Provider Identification Number': [r`\b[12]\d{9}\b`],
  'DEA number': [r`\b[ABCDEFGHJKLMPRSTUX][A-Z9]\d{7}\b`],
  'National Drug Code (NDC)': [r`\b(?:\d{4}-\d{4}-\d{2}|\d{5}-\d{3}-\d{2}|\d{5}-\d{4}-\d)\b`],

  // US driver's licenses — formats vary a lot per state; keywords do the real work
  "US Driver's License - Alabama": [r`\b\d{7,8}\b`],
  "US Driver's License - Alaska": [r`\b\d{7}\b`],
  "US Driver's License - Arizona": [r`\b(?:[A-Z]\d{8}|\d{9})\b`],
  "US Driver's License - Arkansas": [r`\b9\d{8}\b`],
  "US Driver's License - California": [r`\b[A-Z]\d{7}\b`],
  "US Driver's License - Colorado": [r`\b\d{2}-?\d{3}-?\d{4}\b`],
  "US Driver's License - Connecticut": [r`\b\d{9}\b`],
  "US Driver's License - Delaware": [r`\b\d{6,7}\b`],
  "US Driver's License - District of Columbia": [r`\b(?:\d{7}|\d{9})\b`],
  "US Driver's License - Florida": [r`\b[A-Z]\d{3}-?\d{3}-?\d{2}-?\d{3}-?\d\b`],
  "US Driver's License - Georgia": [r`\b\d{9}\b`],
  "US Driver's License - Hawaii": [r`\b(?:H\d{8}|\d{9})\b`],
  "US Driver's License - Idaho": [r`\b[A-Z]{2}\d{6}[A-Z]\b`],
  "US Driver's License - Illinois": [r`\b[A-Z]\d{3}-?\d{4}-?\d{4}\b`],
  "US Driver's License - Indiana": [r`\b\d{4}-?\d{2}-?\d{4}\b`],
  "US Driver's License - Iowa": [r`\b\d{3}[A-Z]{2}\d{4}\b`],
  "US Driver's License - Kansas": [r`\bK\d{2}-?\d{2}-?\d{4}\b`],
  "US Driver's License - Kentucky": [r`\b[A-Z]\d{2}-?\d{3}-?\d{3}\b`],
  "US Driver's License - Louisiana": [r`\b0\d{8}\b`],
  "US Driver's License - Maine": [r`\b\d{7}[A-Z]?\b`],
  "US Driver's License - Maryland": [r`\b[A-Z]-?\d{3}-?\d{3}-?\d{3}-?\d{3}\b`],
  "US Driver's License - Massachusetts": [r`\bS\d{8}\b`],
  "US Driver's License - Michigan": [r`\b[A-Z]\s?\d{3}\s?\d{3}\s?\d{3}\s?\d{3}\b`],
  "US Driver's License - Minnesota": [r`\b[A-Z]\d{12}\b`],
  "US Driver's License - Mississippi": [r`\b8\d{8}\b`],
  "US Driver's License - Missouri": [r`\b[A-Z]\d{9}\b`],
  "US Driver's License - Montana": [r`\b\d{13}\b`],
  "US Driver's License - Nebraska": [r`\b[A-Z]\d{8}\b`],
  "US Driver's License - Nevada": [r`\b\d{10}\b`],
  "US Driver's License - New Hampshire": [r`\b\d{2}[A-Z]{3}\d{5}\b`],
  "US Driver's License - New Jersey": [r`\b[A-Z]\d{4}\s?\d{5}\s?\d{5}\b`],
  "US Driver's License - New Mexico": [r`\b\d{9}\b`],
  "US Driver's License - New York": [r`\b\d{3}\s?\d{3}\s?\d{3}\b`],
  "US Driver's License - North Carolina": [r`\b\d{12}\b`],
  "US Driver's License - North Dakota": [r`\b[A-Z]{3}-?\d{2}-?\d{4}\b`],
  "US Driver's License - Ohio": [r`\b[A-Z]{2}\d{6}\b`],
  "US Driver's License - Oklahoma": [r`\b[A-Z]\d{9}\b`],
  "US Driver's License - Oregon": [r`\b\d{7,9}\b`],
  "US Driver's License - Pennsylvania": [r`\b\d{2}\s?\d{3}\s?\d{3}\b`],
  "US Driver's License - Rhode Island": [r`\b(?:\d{7}|V\d{6})\b`],
  "US Driver's License - South Carolina": [r`\b\d{9,11}\b`],
  "US Driver's License - South Dakota": [r`\b\d{8}\b`],
  "US Driver's License - Tennessee": [r`\b\d{8,9}\b`],
  "US Driver's License - Texas": [r`\b\d{8}\b`],
  "US Driver's License - Utah": [r`\b\d{9}\b`],
  "US Driver's License - Vermont": [r`\b\d{7}[A0-9]\b`],
  "US Driver's License - Virginia": [r`\b[A-Z]\d{2}-?\d{2}-?\d{4}\b`],
  "US Driver's License - Washington": [r`\bWDL[A-Z0-9]{9}\b`, r`\b[A-Z*]{7}[A-Z0-9*]{5}\b`],
  "US Driver's License - West Virginia": [r`\b[A-Z]\d{6}\b`],
  "US Driver's License - Wisconsin": [r`\b[A-Z]\d{3}-?\d{4}-?\d{4}-?\d{2}\b`],
  "US Driver's License - Wyoming": [r`\b\d{6}-?\d{3}\b`],

  // ---------- UK ----------
  'UK NINO': [r`\b(?!BG|GB|NK|KN|TN|NT|ZZ)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z] ?\d{2} ?\d{2} ?\d{2} ?[A-D]\b`],
  'UK NHS': [r`\b\d{3}[ -]?\d{3}[ -]?\d{4}\b`],
  'UK Passport Number': [r`\b\d{9}\b`],
  "UK Driver's License": [r`\b[A-Z9]{5}\d{6}[A-Z9]{2}\d[A-Z]{2}\b`],
  'UK Postal Code': [r`\b[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}\b`],
  'UK Mobile Number': [r`(?:\+44\s?7\d{3}|\b07\d{3})\s?\d{3}\s?\d{3}\b`],
  'UK Domestic Landline Number': [r`(?:\+44\s?|\b0)[1-3]\d{2,4}\s?\d{3}\s?\d{3,4}\b`],
  'UK UTR Number': [r`\b\d{5}\s?\d{5}\b`],
  'UK TIN (tax)': [r`\b\d{5}\s?\d{5}\b`],
  'UK VAT Registration Numbers': [r`\bGB\s?\d{3}\s?\d{4}\s?\d{2}(?:\s?\d{3})?\b`],
  'UK VRN': [r`\b[A-Z]{2}\d{2}\s?[A-Z]{3}\b`],
  'UK TRN (Temporary Reference Number)': [r`\b\d{2}[A-Z]\s?\d{5}\b`],
  'UK Child Benefit Reference Number': [r`\bCHB\s?\d{8}\s?[A-Z]{2}\b`],
  'UK Electoral Roll Number': [r`\b[A-Z]{2,3}\d{1,4}\b`],
  'UK Student Identification Number': [r`\b\d{10}\b`],

  // ---------- Canada ----------
  'Canada Social Insurance Number': [r`\b[1-79]\d{2}[ -]?\d{3}[ -]?\d{3}\b`],
  'Canadian Zip Code': [r`\b[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d\b`],
  'Canada Passport Number': [r`\b[A-Z]{2}\d{6}\b`],
  'Canada Permanent Resident Card Number': [r`\b[A-Z]{2}\d{7}\b`],
  'Canada Health Service Number': [r`\b\d{4}[ -]?\d{3}[ -]?\d{3}(?:[ -]?[A-Z]{2})?\b`],
  'Canada PHIN (Personal Health Identification Number)': [r`\b\d{9}\b`],
  'Canada Driving License - Alberta': [r`\b\d{6}-?\d{3}\b`],
  'Canada Driving License - British Columbia': [r`\b\d{7}\b`],
  'Canada Driving License - Manitoba': [r`\b[A-Z]{2}-?[A-Z]{2}-?[A-Z]{2}-?[A-Z]\d{3}[A-Z]{2}\b`],
  'Canada Driving License - New Brunswick': [r`\b\d{5,7}\b`],
  'Canada Driving License - Newfoundland and Labrador': [r`\b[A-Z]\d{9}\b`],
  'Canada Driving License - Nova Scotia': [r`\b[A-Z]{5}-?\d{9}\b`],
  'Canada Driving License - Ontario': [r`\b[A-Z]\d{4}-?\d{5}-?\d{5}\b`],
  'Canada Driving License - Prince Edward Island': [r`\b\d{5,6}\b`],
  'Canada Driving License - Quebec': [r`\b[A-Z]\d{12}\b`],
  'Canada Driving License - Saskatchewan': [r`\b\d{8}\b`],

  // ---------- Australia ----------
  'Tax File Number (TFN)': [r`\b\d{3}[ -]?\d{3}[ -]?\d{2,3}\b`],
  'Australian Medicare Number': [r`\b[2-6]\d{3}[ -]?\d{5}[ -]?\d(?:[ -]?\d)?\b`],
  'Australian Passport Number': [r`\b[A-Z]{1,2}\d{7}\b`],
  "Australia Driver's License ACT": [r`\b\d{6,10}\b`],
  "Australia Driver's License NSW": [r`\b(?:\d{8}|\d{2}[A-Z]{2}\d{2})\b`],
  "Australia Driver's License NT": [r`\b\d{6,10}\b`],
  "Australia Driver's License QLD": [r`\b\d{8,9}\b`],
  "Australia Driver's License SA": [r`\b[A-Z]\d{5}\b`],
  "Australia Driver's License TAS": [r`\b[A-Z]\d{5,6}\b`],
  "Australia Driver's License VIC": [r`\b\d{8,10}\b`],
  "Australia Driver's License WA": [r`\b\d{7}\b`],

  // ---------- Europe ----------
  'German National Identification Number': [r`\b[CFGHJKLMNPRTVWXYZ0-9]{9}\d?\b`],
  'German National Identification Number (NEW)': [r`\b[LMNPRTVWXYZ][CFGHJKLMNPRTVWXYZ0-9]{8}\d?\b`],
  'German passport number': [r`\b[CFGHJK][CFGHJKLMNPRTVWXYZ0-9]{8}\b`],
  'German Driving License Number': [r`\b[A-Z0-9]\d{2}[A-Z0-9]{6}\d[A-Z0-9]\b`],
  'German VAT ID (USt-IdNr.)': [r`\bDE\s?\d{9}\b`],
  'German VAT ID (person)': [r`\b\d{2}\s?\d{3}\s?\d{3}\s?\d{3}\b`],
  'German Social Security Number (SIN)': [r`\b\d{2}\s?\d{6}\s?[A-Z]\s?\d{3}\b`],
  'Versicherungsnummer or pension number (RVNR)': [r`\b\d{2}\s?\d{6}\s?[A-Z]\s?\d{3}\b`],
  'German Vehicle Registration Number (license plate)': [r`\b[A-ZÄÖÜ]{1,3}[ -][A-Z]{1,2}[ -]?\d{1,4}[EH]?\b`],
  "French national ID ( carte nationale d'identité)": [r`\b\d{12}\b`, r`\b[A-Z0-9]{9}\b`],
  'French passport number': [r`\b\d{2}[A-Z]{2}\d{5}\b`],
  'French Driving License Number': [r`\b\d{12}\b`],
  'French VAT Identification Number': [r`\bFR\s?[0-9A-Z]{2}\s?\d{9}\b`],
  'French tax ID (Taxe sur la Valeur Ajoutée)': [r`\bFR\s?[0-9A-Z]{2}\s?\d{9}\b`],
  'French Vehicle Registration Number (license plate)': [r`\b[A-Z]{2}-\d{3}-[A-Z]{2}\b`],
  INSEE: [r`\b[12]\s?\d{2}\s?(?:0[1-9]|1[0-2])\s?(?:\d{2}|2[AB])\s?\d{3}\s?\d{3}\s?\d{2}\b`],
  'Codice Fiscale': [r`\b[A-Z]{6}\d{2}[A-EHLMPR-T]\d{2}[A-Z]\d{3}[A-Z]\b`],
  'Italian Driving License Number': [r`\b[A-Z]{2}\d{7}[A-Z]\b`],
  'Italian Electronic Identity Card (carta di identità eletronica)': [r`\b[A-Z]{2}\d{5}[A-Z]{2}\b`],
  "Italian Personal Identification Card (carta d'IdentitÃ)": [r`\b[A-Z]{2}\s?\d{7}\b`],
  'Italian Health Insurance ID (tessera sanitaria)': [r`\b80380\d{15}\b`, r`\b[A-Z]{6}\d{2}[A-EHLMPR-T]\d{2}[A-Z]\d{3}[A-Z]\b`],
  'Italian VAT Code': [r`\b(?:IT\s?)?\d{11}\b`],
  'Spanish national identity card (Documento Nacional de Identidad)': [r`\b\d{8}[ -]?[A-Z]\b`],
  'Spanish Tax Identification Number (Numero de Identificacion Fiscal)': [r`\b\d{8}[ -]?[A-Z]\b`, r`\b[XYZ]\d{7}[A-Z]\b`],
  'Spanish Passport Number': [r`\b[A-Z]{3}\d{6}\b`],
  'Spanish Social Security Number (SSN)': [r`\b\d{2}[ /-]?\d{8}[ /-]?\d{2}\b`],
  'Belgium Identification Number': [r`\b\d{2}\.?\d{2}\.?\d{2}-?\d{3}\.?\d{2}\b`],
  'Belgium ID Card Number': [r`\b\d{3}-?\d{7}-?\d{2}\b`],
  'Dutch Postal Code': [r`\b[1-9]\d{3}\s?[A-Z]{2}\b`],
  'Denmark Personal Identification Number': [r`\b(?:0[1-9]|[12]\d|3[01])(?:0[1-9]|1[0-2])\d{2}-?\d{4}\b`],
  'Sweden National ID': [r`\b(?:19|20)?\d{6}[-+]?\d{4}\b`],
  'Finland National ID': [r`\b\d{6}[-+AUVWXYBCDEF]\d{3}[0-9A-Y]\b`],
  'Finland Passport Number': [r`\b[A-Z]{2}\d{7}\b`],
  'Personal Public Service Number PPSN': [r`\b\d{7}[A-W][A-IW]?\b`],
  'Birth Number Rodne Cislo Czech': [r`\b\d{6}/?\d{3,4}\b`],
  'Uniform Civil Number EGN': [r`\b\d{10}\b`],

  // ---------- Rest of world ----------
  'CPF Number': [r`\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b`],
  'CNPJ (Cadastro Nacional de Pessoa Juridica)': [r`\b\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}\b`],
  'Argentina National ID (DNI)': [r`\b\d{2}\.?\d{3}\.?\d{3}\b`],
  'Chile Identification Number RUN or RUT': [r`\b\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]\b`],
  'South African ID Number': [r`\b\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{4}[01]\d{2}\b`],
  'National Registration Identity Card (NRIC)': [r`\b[STFGM]\d{7}[A-Z]\b`],
  'Malaysia Mykad': [r`\b\d{6}-?\d{2}-?\d{4}\b`],
  'Malaysia Passport number': [r`\b[AHK]\d{8}\b`],
  'Malaysia Mobile number': [r`(?:\+?60|\b0)1[0-46-9]-?\d{3,4}\s?\d{4}\b`],
  'Malaysia Phone number (land line)': [r`(?:\+?60|\b0)[3-9]-?\d{3,4}\s?\d{4}\b`],
  'Malaysian Income Tax Number': [r`\b(?:SG|OG|D|C|J|F|TA|TC|TN|TR|TP|LE|PT|TF)\s?\d{10,11}\b`],
  'Saudi Arabia National ID': [r`\b[12]\d{9}\b`],
  'Saudi Arabia Driving License': [r`\b[12]\d{9}\b`],
  'Saudi Arabia Passport number': [r`\b[A-Z]\d{8}\b`],
  'Saudi Arabia TIN': [r`\b3\d{14}\b`],
  'Saudi Arabia Mobile number': [r`(?:\+?966|\b0)5\d{8}\b`],
  'Saudi Arabia phone number (land line)': [r`(?:\+?966|\b0)1[1-7]\d{7}\b`],
  'Taiwan National ID': [r`\b[A-Z][12]\d{8}\b`],
  'Taiwan Resident Certificate Number': [r`\b[A-Z][A-D89]\d{8}\b`],
  'Taiwan Passport Number': [r`\b\d{9}\b`],
};

const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
const INDEX = new Map(Object.entries(LIBRARY).map(([k, v]) => [norm(k), v]));

function lookupRegexes(name) {
  return INDEX.get(norm(name)) || [];
}

module.exports = { LIBRARY, lookupRegexes };
