"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { ArrowRight, Check, FileText, LockKeyhole, ShieldCheck, UploadCloud, X } from "lucide-react";
import { DETECTORS, RISKS } from "@/lib/types";
import { MAX_FILE_BYTES } from "@/lib/upload";
import { Button, Checkbox, EmptyState, Message, Panel, RiskBadge } from "./ui";
import { RecordsTable } from "./records-table";

const resultSchema = z.object({
  id: z.uuid(), risk: z.enum(RISKS), total_findings: z.number(), duration_ms: z.number(),
  findings: z.array(z.object({
    detector: z.enum(["email", "uk_phone", "uk_nino", "payment_card"]), risk: z.enum(RISKS),
    count: z.number(), masked_example: z.string(),
  })),
});

export function UploadView({ preview }: { preview: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<z.infer<typeof resultSchema> | null>(null);
  const [filename, setFilename] = useState("");
  function choose(files: FileList | null) {
    setError(""); setResult(null);
    if (!files?.length) return;
    setFile(null);
    if (files.length !== 1) { setError("Choose exactly one CSV or TXT file."); return; }
    const selected = files[0];
    if (!/\.(csv|txt)$/i.test(selected.name)) { setError("Only CSV and TXT files are supported."); return; }
    if (!selected.size || selected.size > MAX_FILE_BYTES) { setError("Choose a non-empty file no larger than 1 MiB (1,048,576 bytes)."); return; }
    setFile(selected);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file || !consent || busy || preview) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const body = new FormData();
      body.set("file", file); body.set("synthetic", "true");
      const response = await fetch("/api/scans", { method: "POST", body });
      const json: unknown = await response.json();
      if (!response.ok) {
        const parsed = z.object({ error: z.string() }).safeParse(json);
        setError(parsed.success ? parsed.data.error : "The scan request failed. Please retry.");
        return;
      }
      const parsed = resultSchema.safeParse(json);
      if (!parsed.success) { setError("The server returned an unexpected result. Check your scan history before retrying to avoid a duplicate scan."); return; }
      setFilename(file.name); setResult(parsed.data); setFile(null); setConsent(false);
      if (input.current) input.current.value = "";
      router.refresh();
    } catch {
      setError("The scan response could not be received. Check your connection and scan history before retrying.");
    } finally { setBusy(false); }
  }
  return <div className="upload-layout">
    <div className="stack">
      <Panel title="Discover sensitive data" actions={<span className="lp-badge lp-badge--neutral">CSV / TXT</span>}>
        <form onSubmit={submit} className="stack" aria-busy={busy}>
          <p>Upload a synthetic file. We&apos;ll classify the findings and save only masked examples.</p>
          {error && <Message title="The scan could not complete">{error}</Message>}
          {preview && <Message title="Read-only interface preview" variant="info">Real uploads require a signed-in account and a configured Supabase project. No files can be uploaded in preview.</Message>}
          <div className={`upload-zone${dragging ? " upload-zone-active" : ""}`} onDragOver={(event) => { event.preventDefault(); if (!preview && !busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); if (!preview && !busy) choose(event.dataTransfer.files); }}>
            <div className="upload-symbol"><UploadCloud size={32} aria-hidden="true" /></div>
            <strong>{file ? file.name : "Drop your file here"}</strong>
            <p className="caption">{file ? `${file.size.toLocaleString()} bytes · Ready to scan` : "or choose a file from your computer"}</p>
            <input ref={input} id="scan-file" className="sr-only" type="file" accept=".csv,.txt,text/plain,text/csv" disabled={preview || busy} tabIndex={-1} aria-label="Synthetic file to scan" onChange={(event) => choose(event.target.files)} />
            <Button variant="secondary" disabled={preview || busy} onClick={() => input.current?.click()}>{file ? "Choose another file" : "Choose file"}</Button>
            <span className="caption">UTF-8 text only · Maximum 1 MiB · One file per scan</span>
          </div>
          {file && <div className="selected-file"><FileText aria-hidden="true" /><span>{file.name}</span><Button variant="secondary" small disabled={busy} aria-label="Remove selected file" onClick={() => { setFile(null); if (input.current) input.current.value = ""; }}><X size={14} aria-hidden="true" /></Button></div>}
          <Checkbox checked={consent} onChange={(event) => setConsent(event.target.checked)} required disabled={preview || busy}>I confirm this file contains synthetic training data only.</Checkbox>
          <div className="scan-actions"><span className="caption"><LockKeyhole size={14} aria-hidden="true" />Originals are never stored</span><Button type="submit" disabled={!file || !consent || busy || preview}>{busy ? "Scanning and saving..." : "Run scan"}<span className="lp-button__icon-right"><ArrowRight aria-hidden="true" /></span></Button></div>
          {busy && <p role="status" className="caption">Validating the file, running detectors, masking findings, and saving atomically. Please keep this page open.</p>}
        </form>
      </Panel>
      {result ? <Panel title={`Scan completed: ${filename}`} actions={<RiskBadge risk={result.risk} />}>
        <div className="result-summary"><Check size={20} aria-hidden="true" /><strong>{result.total_findings.toLocaleString()} occurrences</strong><span>{result.duration_ms} ms detection time</span></div>
        {result.findings.length ? <RecordsTable caption="Latest masked scan results" rows={result.findings} rowKey={(row) => row.detector} paginate={false} columns={[
          { key: "type", label: "Data type", value: (row) => DETECTORS[row.detector].label },
          { key: "example", label: "Masked example", value: (row) => row.masked_example, render: (row) => <code>{row.masked_example}</code> },
          { key: "count", label: "Occurrences", value: (row) => row.count },
          { key: "risk", label: "Risk", value: (row) => RISKS.indexOf(row.risk), render: (row) => <RiskBadge risk={row.risk} /> },
        ]} /> : <EmptyState>No supported sensitive-data patterns were found. This does not guarantee the file contains no sensitive data.</EmptyState>}
        <div className="result-link"><Link href={`/dashboard/findings?scan=${result.id}`} className="lp-link lp-link--standalone">View saved findings <ArrowRight size={16} aria-hidden="true" /></Link></div>
      </Panel> : <Panel title="A clear path from file to insight"><div className="scan-flow">{["Validate file", "Detect patterns", "Mask examples", "Save findings"].map((label, index) => <div key={label}><span>{index + 1}</span><strong>{label}</strong></div>)}</div></Panel>}
    </div>
    <aside className="stack">
      <Panel title="What we look for"><div className="detector-list">{Object.entries(DETECTORS).map(([key, value]) => <div className="detector-item" key={key}><div className="section-line"><strong>{value.label}</strong><RiskBadge risk={value.risk} /></div><p className="caption">{value.description}</p></div>)}</div></Panel>
      <Panel title="Small scope. Safer defaults."><ul className="privacy-list"><li><ShieldCheck size={18} aria-hidden="true" />Raw file content is processed in server memory only.</li><li><ShieldCheck size={18} aria-hidden="true" />Only metadata and masked examples reach the database.</li><li><ShieldCheck size={18} aria-hidden="true" />Each account can access only its own records.</li></ul><a href="/samples/synthetic-demo.csv" download className="lp-link lp-link--standalone">Download a synthetic sample <ArrowRight size={16} aria-hidden="true" /></a></Panel>
    </aside>
  </div>;
}
