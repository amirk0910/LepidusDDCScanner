// Quick command-line test:  node cli.js path/to/file.pdf
const fs = require('fs');
const path = require('path');
const { loadPatterns } = require('./patternLoader');
const { extractText } = require('./textExtractor');
const { scan } = require('./scanner');

(async () => {
  const file = process.argv[2];
  if (!file) return console.log('usage: node cli.js <file>');
  const patterns = loadPatterns(process.env.PATTERN_DIR || path.join(__dirname, 'patterns'));
  const text = await extractText(fs.readFileSync(file), file);
  console.log(JSON.stringify(scan(text, patterns), null, 2));
})();
