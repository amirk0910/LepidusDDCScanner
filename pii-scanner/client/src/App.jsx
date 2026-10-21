import { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

const ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/*': ['.txt', '.csv', '.tsv', '.json', '.xml', '.log', '.md', '.html'],
};

export default function App() {
  const [files, setFiles] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [minConfidence, setMinConfidence] = useState('medium');
  const [patternInfo, setPatternInfo] = useState(null);

  useEffect(() => {
    fetch('/api/patterns')
      .then((r) => r.json())
      .then((list) =>
        setPatternInfo({
          total: list.length,
          withRegex: list.filter((p) => p.regexCount > 0).length,
          keywordOnly: list.filter((p) => p.regexSource === 'none').length,
          broken: list.filter((p) => p.errors.length),
        })
      )
      .catch(() => setError('Cannot reach the server on port 5000 - is it running?'));
  }, []);

  const onDrop = useCallback((accepted) => setFiles((prev) => [...prev, ...accepted].slice(0, 10)), []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: ACCEPT, maxSize: 25 * 1024 * 1024 });

  async function scan() {
    setLoading(true);
    setError('');
    setReports([]);
    try {
      const body = new FormData();
      files.forEach((f) => body.append('files', f));
      body.append('minConfidence', minConfidence);
      const res = await fetch('/api/scan', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      setReports(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <header>
        <h1>Sensitive Data Scanner</h1>
        {patternInfo && (
          <p className="muted">
            {patternInfo.total} data types loaded · {patternInfo.withRegex} with regex · {patternInfo.keywordOnly} keyword-only
            {patternInfo.broken.length > 0 && <span className="warn"> · {patternInfo.broken.length} pattern files have problems (see server log)</span>}
          </p>
        )}
      </header>

      <div {...getRootProps({ className: `dropzone ${isDragActive ? 'active' : ''}` })}>
        <input {...getInputProps()} />
        <p>{isDragActive ? 'Drop the files here…' : 'Drag files here, or click to choose (PDF, DOCX, XLSX, CSV, TXT…)'}</p>
      </div>

      {files.length > 0 && (
        <ul className="files">
          {files.map((f, i) => (
            <li key={i}>
              {f.name} <span className="muted">({(f.size / 1024).toFixed(1)} KB)</span>
              <button className="link" onClick={() => setFiles(files.filter((_, j) => j !== i))}>remove</button>
            </li>
          ))}
        </ul>
      )}

      <div className="controls">
        <label>
          Minimum confidence{' '}
          <select value={minConfidence} onChange={(e) => setMinConfidence(e.target.value)}>
            <option value="low">Low (show everything)</option>
            <option value="medium">Medium</option>
            <option value="high">High (checksum / keyword confirmed)</option>
          </select>
        </label>
        <button disabled={!files.length || loading} onClick={scan}>
          {loading ? 'Scanning…' : 'Scan files'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {reports.map((r) => (
        <section key={r.file} className="report">
          <h2>{r.file}</h2>
          {r.error ? (
            <p className="error">{r.error}</p>
          ) : r.detected.length === 0 ? (
            <p className="ok">No sensitive data types detected.</p>
          ) : (
            <>
              <p className="muted">
                {r.detected.length} data type(s) found · {r.characters.toLocaleString()} characters scanned in {r.ms} ms
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Data type</th>
                    <th>Risk</th>
                    <th>Matches</th>
                    <th>Confidence</th>
                    <th>Examples (masked)</th>
                  </tr>
                </thead>
                <tbody>
                  {r.detected.map((d) => (
                    <tr key={d.type}>
                      <td title={d.description}>
                        {d.type}
                        {d.description && <div className="muted small">{d.description}</div>}
                      </td>
                      <td>{d.riskLevel ?? '–'}</td>
                      <td>{d.count}</td>
                      <td>
                        <span className={`badge ${d.confidence}`}>{d.confidence}</span>
                      </td>
                      <td className="mono">
                        {d.kind === 'keywords' ? `keywords: ${d.keywordsFound.join(', ')}` : d.samples.map((s) => s.value).join('  ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      ))}
    </main>
  );
}
