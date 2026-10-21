const path = require('path');
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { loadPatterns } = require('./patternLoader');
const { extractText } = require('./textExtractor');
const { scan } = require('./scanner');

const PORT = process.env.PORT || 5000;
const PATTERN_DIR = process.env.PATTERN_DIR || path.join(__dirname, 'patterns');

let patterns = loadPatterns(PATTERN_DIR);

const app = express();
app.use(cors());

// files stay in memory and are never written to disk
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 10 } });

app.get('/api/patterns', (_req, res) => {
  res.json(
    patterns.map((p) => ({
      name: p.name,
      file: p.file,
      description: p.description,
      riskLevel: p.riskLevel,
      regexSource: p.regexSource, // xml | decrypted | library | none (keyword-only)
      regexCount: p.regexes.length,
      keywordCount: p.keywords.length,
      negKeywordCount: p.negKeywords?.length || 0,
      requireKeyword: !!p.requireKeyword,
      proximityWords: p.proximityWords,
      engines: [...new Set(p.regexes.map((r) => r.engine))],
      errors: p.errors,
    }))
  );
});

app.post('/api/patterns/reload', (_req, res) => {
  patterns = loadPatterns(PATTERN_DIR);
  res.json({ loaded: patterns.length });
});

app.post('/api/scan', upload.array('files', 10), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded (field name must be "files")' });

  const opts = {};
  if (req.body.minConfidence) opts.minConfidence = req.body.minConfidence;

  const reports = [];
  for (const f of req.files) {
    const started = Date.now();
    try {
      const text = await extractText(f.buffer, f.originalname, f.mimetype);
      const detected = scan(text, patterns, opts);
      reports.push({ file: f.originalname, size: f.size, characters: text.length, ms: Date.now() - started, detected });
    } catch (e) {
      reports.push({ file: f.originalname, size: f.size, error: e.message });
    }
  }
  res.json(reports);
});

// serve the built React app in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

app.listen(PORT, () => console.log(`Scanner API on http://localhost:${PORT}`));
