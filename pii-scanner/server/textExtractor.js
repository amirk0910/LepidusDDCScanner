/**
 * Turns an uploaded file (Buffer) into plain text so the regexes can run on it.
 */
const path = require('path');

const TEXT_EXT = new Set(['.txt', '.csv', '.tsv', '.json', '.xml', '.log', '.md', '.html', '.htm', '.yaml', '.yml', '.sql', '.ini', '.conf']);

async function extractText(buffer, filename, mimetype = '') {
  const ext = path.extname(filename).toLowerCase();

  if (ext === '.pdf') {
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    try {
      const { text } = await parser.getText();
      return text; // scanned PDFs have no text layer -> needs OCR (see README)
    } finally {
      await parser.destroy();
    }
  }

  if (ext === '.docx') {
    const mammoth = require('mammoth');
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  if (['.xlsx', '.xls', '.ods'].includes(ext)) {
    const XLSX = require('xlsx');
    const wb = XLSX.read(buffer, { type: 'buffer' });
    return wb.SheetNames.map((n) => XLSX.utils.sheet_to_csv(wb.Sheets[n])).join('\n');
  }

  if (TEXT_EXT.has(ext) || mimetype.startsWith('text/')) {
    let text = buffer.toString('utf8');
    if (ext === '.html' || ext === '.htm') text = text.replace(/<[^>]+>/g, ' ');
    return text;
  }

  throw new Error(`Unsupported file type "${ext || mimetype}"`);
}

module.exports = { extractText };
