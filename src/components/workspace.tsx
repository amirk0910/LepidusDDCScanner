"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { ArrowRight, ChartNoAxesCombined, CircleHelp, Download, FileCheck2, FileSearch, FileText, Fingerprint, History, LayoutDashboard, LoaderCircle, LockKeyhole, LogOut, Settings2, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { exportCsv } from "@/lib/csv";
import { exportFilterSchema, filterScans } from "@/lib/filters";
import { activity, summarize } from "@/lib/metrics";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import { DETECTORS, RISKS, type Scan, type WorkspaceView } from "@/lib/types";
import { Brand, Button, Dropdown, EmptyState, Field, Message, Panel, RiskBadge } from "./ui";
import { ThemeControls } from "./providers";
import { RiskDonut, TrendChart } from "./charts";
import { RecordsTable, type Column } from "./records-table";
import { UploadView } from "./upload-view";

const VIEWS = [
  { key: "overview", label: "Overview", Icon: LayoutDashboard },
  { key: "scan", label: "Discover", Icon: FileSearch },
  { key: "findings", label: "Findings", Icon: Fingerprint },
  { key: "history", label: "History", Icon: History },
  { key: "settings", label: "Settings", Icon: Settings2 },
] as const;
const HEADINGS: Record<WorkspaceView, { title: string; description: string }> = {
  overview: { title: "Your data, in focus.", description: "Discover what's sensitive. Understand what needs your attention." },
  scan: { title: "Discover & classify", description: "Turn a synthetic file into clear, masked security insights." },
  findings: { title: "Sensitive data findings", description: "Investigate classified patterns without exposing sensitive values." },
  history: { title: "Scan history", description: "Every completed scan. A clear record of your discovery activity." },
  settings: { title: "Workspace settings", description: "Your account, appearance, and data protection controls." },
};
const dateLabel = (value: string) => new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function Workspace({ scans, view, preview = false, displayName, email, initialScanId = "" }: {
  scans: Scan[]; view: WorkspaceView; preview?: boolean; displayName: string; email: string; initialScanId?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState("All");
  const [detector, setDetector] = useState("All");
  const [scanId, setScanId] = useState(initialScanId);
  const [period, setPeriod] = useState("7");
  const [exporting, setExporting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const href = (target: WorkspaceView) => preview ? `/preview?view=${target}` : target === "overview" ? "/dashboard" : `/dashboard/${target}`;
  const findingHref = (id: string) => `${href("findings")}${preview ? "&" : "?"}scan=${id}`;
  const heading = HEADINGS[view];
  const summary = summarize(scans);
  const trend = activity(scans, Number(period), preview ? new Date("2026-10-21T12:00:00Z") : new Date());
  const selectedFile = scanId ? scans.find((scan) => scan.id === scanId) : null;
  const filters = exportFilterSchema.parse({ scope: view === "findings" ? "findings" : "scans", search, risk, detector, ...(scanId ? { scan: scanId } : {}) });
  const filtered = filterScans(scans, filters);
  const rows = filtered.flatMap((scan) => scan.findings.map((finding) => ({ ...finding, scan })));
  function clearFilters() { setSearch(""); setRisk("All"); setDetector("All"); setScanId(""); }
  async function download() {
    setExporting(true); setError(""); setNotice("");
    try {
      let blob: Blob;
      if (preview) blob = new Blob([exportCsv(filtered)], { type: "text/csv;charset=utf-8" });
      else {
        const response = await fetch(`/api/export?${new URLSearchParams(Object.entries(filters).filter((entry): entry is [string, string] => typeof entry[1] === "string"))}`);
        if (!response.ok) {
          const parsed = z.object({ error: z.string() }).safeParse(await response.json());
          setError(parsed.success ? parsed.data.error : "The report could not be exported. Try again.");
          return;
        }
        blob = await response.blob();
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = preview ? "lepide-illustrative-preview.csv" : "lepide-masked-findings.csv";
      document.body.append(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(preview ? "Exported an illustrative, masked preview report. This is not live account data." : "Exported the masked report with your current filters.");
    } catch { setError("The report could not be downloaded. Check your connection and retry."); }
    finally { setExporting(false); }
  }
  async function signOut() {
    setSigningOut(true); setError("");
    try {
      const { error } = await createSupabaseBrowser().auth.signOut();
      if (error) { setError("Sign-out failed. Check your connection and retry."); return; }
      router.replace("/login"); router.refresh();
    } catch { setError("Sign-out could not reach Supabase. Check your connection and retry."); }
    finally { setSigningOut(false); }
  }
  const scanColumns: Column<Scan>[] = [
    { key: "file", label: "File name", value: (scan) => scan.filename, render: (scan) => <span className="file-cell"><FileText size={17} aria-hidden="true" /><Link href={findingHref(scan.id)} className="lp-link lp-link--inline">{scan.filename}</Link></span> },
    { key: "date", label: "Scanned on", value: (scan) => scan.created_at, render: (scan) => <span className="caption nowrap">{dateLabel(scan.created_at)}</span> },
    { key: "risk", label: "Classification", value: (scan) => RISKS.indexOf(scan.risk), render: (scan) => <RiskBadge risk={scan.risk} /> },
    { key: "findings", label: "Findings", value: (scan) => scan.total_findings },
    { key: "size", label: "File size", value: (scan) => scan.size_bytes, render: (scan) => `${(scan.size_bytes / 1024).toFixed(1)} KB` },
  ];
  return <div className="workspace-shell">
    <div className="nav-rail"><nav className="lp-sidebar" aria-label="Primary navigation" style={{ width: "100%" }}>
      <div className="lp-sidebar__header"><Link href={href("overview")} aria-label="MiniDSP overview"><Brand compact /></Link></div>
      <ul className="lp-sidebar__items">{VIEWS.map(({ key, label, Icon }) => <li key={key}><Link href={href(key)} className={`lp-sidebar__item${view === key ? " lp-sidebar__item--active" : ""}`} aria-current={view === key ? "page" : undefined}><span className="lp-sidebar__icon-box"><Icon aria-hidden="true" /></span><span className="lp-sidebar__label">{label}</span></Link></li>)}</ul>
      <div className="lp-sidebar__footer"><Link href="/setup" className="lp-sidebar__item" aria-label="Setup help"><span className="lp-sidebar__icon-box"><CircleHelp aria-hidden="true" /></span><span className="lp-sidebar__label">Help</span></Link></div>
    </nav></div>
    <div className="workspace-body">
      <header className="workspace-topbar"><Link href={href("overview")} className="brand-link"><Brand /></Link><span className="workspace-label">Data Discovery & Classification</span><div className="topbar-right"><span className="training-badge"><ShieldCheck size={14} aria-hidden="true" />Training workspace</span><ThemeControls /><span className="account-avatar" title={displayName}>{displayName.slice(0, 1).toUpperCase()}</span>{!preview && <Button small variant="secondary" onClick={signOut} disabled={signingOut} aria-label="Sign out"><LogOut size={16} aria-hidden="true" /></Button>}</div></header>
      {preview && <div className="preview-banner"><Sparkles size={17} aria-hidden="true" /><span><strong>Interface preview</strong> · Fictional, read-only data. Supabase is not connected to this preview.</span><Link href="/login" className="lp-link lp-link--inline">Sign in <ArrowRight size={15} aria-hidden="true" /></Link></div>}
      <main id="main-content" className="workspace-main">
        <div className="breadcrumbs"><span>Workspace</span><span aria-hidden="true">/</span><strong>{VIEWS.find((item) => item.key === view)?.label}</strong></div>
        <div className="page-heading"><div><span className="eyebrow">{view === "overview" ? `WELCOME ${preview ? "TO MINIDSP" : "BACK"}` : "MINIDSP WORKSPACE"}</span><h1>{heading.title}</h1><p>{heading.description}</p></div><div className="actions">
          {["overview", "history", "findings"].includes(view) && <Button variant="secondary" onClick={download} disabled={exporting || !filtered.length}><span className="lp-button__icon-left">{exporting ? <LoaderCircle className="spin" aria-hidden="true" /> : <Download aria-hidden="true" />}</span>{exporting ? "Exporting..." : "Export report"}</Button>}
          {view !== "scan" && view !== "settings" && <Link href={href("scan")} className="lp-link lp-link--standalone">Run a new scan <ArrowRight size={17} aria-hidden="true" /></Link>}
        </div></div>
        {error && <Message title="Action could not complete">{error}</Message>}
        {notice && <Message title="Report ready" variant="success">{notice}</Message>}
        {view === "overview" && <>
          <div className="section-line"><span className="caption">ALL-TIME OVERVIEW</span><span className="caption">{preview ? "Illustrative account" : "Your account only"} · {scans.length.toLocaleString()} completed scans</span></div>
          <div className="kpi-grid">
            {[{ label: "Files scanned", value: summary.files, Icon: FileCheck2, detail: "Completed discovery scans", className: "kpi-blue" }, { label: "Sensitive findings", value: summary.findings, Icon: Fingerprint, detail: "Non-overlapping occurrences", className: "kpi-cyan" }, { label: "Critical files", value: summary.critical, Icon: ShieldAlert, detail: "Payment card candidates", className: "kpi-red" }, { label: "High-risk files", value: summary.high, Icon: ShieldCheck, detail: "National Insurance formats", className: "kpi-amber" }].map(({ label, value, Icon, detail, className }) => <Panel key={label}><div className="kpi-content"><div className="section-line"><span>{label}</span><span className={`kpi-icon ${className}`}><Icon size={20} aria-hidden="true" /></span></div><strong className="kpi-value">{value.toLocaleString()}</strong><span className="caption">{detail}</span></div></Panel>)}
          </div>
          <div className="chart-grid">
            <Panel title="Discovery activity" actions={<Dropdown label="Activity period" value={period} options={[{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }]} onChange={setPeriod} />}>
              <div className="chart-summary"><strong>{trend.values.reduce((sum, value) => sum + value, 0).toLocaleString()}</strong><span className="caption">findings in this period · UTC</span><span className="chart-label"><span className="chart-dot" style={{ background: "var(--color-brand-accent)" }} />Sensitive findings</span></div>
              <TrendChart {...trend} />
            </Panel>
            <Panel title="Risk distribution" actions={<ChartNoAxesCombined size={18} aria-hidden="true" />}><RiskDonut data={summary.distribution} /></Panel>
          </div>
          <div className="section-line"><h2 className="section-title">Recent scans</h2><Link href={href("history")} className="lp-link lp-link--inline">View all scans <ArrowRight size={16} aria-hidden="true" /></Link></div>
          {scans.length ? <RecordsTable caption="Recent scans" rows={scans.slice(0, 5)} columns={scanColumns} rowKey={(scan) => scan.id} paginate={false} /> : <Panel><EmptyState action={<Link href={href("scan")} className="lp-link lp-link--standalone">Run your first scan <ArrowRight size={16} aria-hidden="true" /></Link>}>No scans yet. Upload a synthetic CSV or TXT file to start discovering sensitive-data patterns.</EmptyState></Panel>}
          <div className="privacy-strip"><LockKeyhole size={19} aria-hidden="true" /><div><strong>Visibility without exposure.</strong><span>Original files are not stored. Findings and exports contain masked examples only.</span></div><span className="lp-badge lp-badge--success">Masked by design</span></div>
        </>}
        {view === "scan" && <UploadView preview={preview} />}
        {(view === "history" || view === "findings") && <>
          <div className="filter-toolbar"><div className="search-filter"><Field id="search-files" label="Search filenames" placeholder="Search by file name..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            <div className="filter-control"><span className="caption">Risk level</span><Dropdown label="Risk level" value={risk} options={[{ value: "All", label: "All risk levels" }, ...[...RISKS].reverse().map((value) => ({ value, label: value }))]} onChange={setRisk} /></div>
            {view === "findings" && <div className="filter-control"><span className="caption">Data type</span><Dropdown label="Data type" value={detector} options={[{ value: "All", label: "All data types" }, ...Object.entries(DETECTORS).map(([value, item]) => ({ value, label: item.label }))]} onChange={setDetector} /></div>}
            <Button variant="secondary" small onClick={clearFilters}>Clear filters</Button>
          </div>
          {selectedFile && <Message title={`Showing findings for ${selectedFile.filename}`} variant="info">Use Clear filters to see findings from all scans.</Message>}
          {scanId && !selectedFile && <Message title="The selected scan is unavailable" variant="warning">It may have been deleted or belong to a different account. Clear the filters to continue.</Message>}
          <div className="section-line"><span className="caption">{view === "history" ? `${filtered.length} scans` : `${rows.length} aggregated findings · ${rows.reduce((sum, row) => sum + row.count, 0).toLocaleString()} occurrences`}</span><span className="caption">All examples masked · Dates shown in your local time</span></div>
          {scans.length === 0 ? <Panel><EmptyState action={<Link href={href("scan")} className="lp-link lp-link--standalone">Run your first scan</Link>}>No scan records yet. Scan a synthetic file to populate your history and findings.</EmptyState></Panel> : view === "history" ? <RecordsTable caption="Scan history" rows={filtered} columns={scanColumns} rowKey={(scan) => scan.id} /> : <RecordsTable caption="Masked findings" rows={rows} rowKey={(row) => `${row.scan.id}:${row.detector}`} columns={[
            { key: "file", label: "File name", value: (row) => row.scan.filename, render: (row) => <span className="file-cell"><FileText size={16} aria-hidden="true" />{row.scan.filename}</span> },
            { key: "type", label: "Data type", value: (row) => DETECTORS[row.detector].label },
            { key: "example", label: "Masked example", value: (row) => row.masked_example, render: (row) => <code className="masked-value">{row.masked_example}</code> },
            { key: "risk", label: "Risk level", value: (row) => RISKS.indexOf(row.risk), render: (row) => <RiskBadge risk={row.risk} /> },
            { key: "count", label: "Occurrences", value: (row) => row.count },
            { key: "date", label: "Scanned on", value: (row) => row.scan.created_at, render: (row) => <span className="caption nowrap">{dateLabel(row.scan.created_at)}</span> },
          ]} />}
        </>}
        {view === "settings" && <div className="settings-grid">
          <Panel title="Your account"><dl className="settings-details"><dt>Display name</dt><dd>{displayName}</dd><dt>Email address</dt><dd>{email}</dd><dt>Workspace mode</dt><dd>{preview ? "Fictional read-only preview" : "Authenticated training account"}</dd><dt>File support</dt><dd>CSV / TXT · UTF-8 · Up to 1 MiB</dd></dl></Panel>
          <Panel title="Appearance"><div className="stack"><p>Choose light, dark, or high contrast. Your preference is saved in this browser.</p><ThemeControls /><p className="caption">All interface colors resolve from the supplied Lepidus design tokens.</p></div></Panel>
          <Panel title="Data protection"><ul className="privacy-list"><li><ShieldCheck aria-hidden="true" size={18} />No original uploads or raw detected values are persisted.</li><li><ShieldCheck aria-hidden="true" size={18} />Supabase row-level policies isolate account records.</li><li><ShieldCheck aria-hidden="true" size={18} />Scans and findings are saved together, atomically.</li><li><ShieldCheck aria-hidden="true" size={18} />Exports neutralize spreadsheet formulas in filenames.</li></ul></Panel>
          <Panel title="Training limitations"><div className="stack"><p>Pattern matches are indicators, not proof of identity or payment-card validity. No findings does not mean no sensitive data.</p><p>PDF, DOCX, images, OCR, file-system crawling, and production data are outside this prototype&apos;s scope.</p><Link href="/setup" className="lp-link lp-link--standalone">View Supabase setup <ArrowRight size={16} aria-hidden="true" /></Link></div></Panel>
        </div>}
        <footer className="workspace-footer"><span>lepide MiniDSP</span><span><LockKeyhole size={13} aria-hidden="true" />Synthetic data only. Not for production use.</span></footer>
      </main>
    </div>
  </div>;
}
