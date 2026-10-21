"use client";

import { useId, useState } from "react";
import type { Risk } from "@/lib/types";

export const RISK_COLORS: Record<Risk, string> = {
  Critical: "var(--color-chart-series-1)",
  High: "var(--color-chart-series-2)",
  Medium: "var(--color-chart-series-5)",
  Low: "var(--color-chart-series-4)",
  None: "var(--color-chart-series-3)",
};

export function TrendChart({ labels, values, name = "Findings", compact = false }: { labels: string[]; values: number[]; name?: string; compact?: boolean }) {
  const id = useId().replace(/:/g, "");
  const [focused, setFocused] = useState<number | null>(null);
  const active = Math.min(focused ?? values.length - 1, values.length - 1);
  const max = Math.max(4, ...values);
  const x = (index: number) => 38 + (index / Math.max(1, values.length - 1)) * 552;
  const y = (value: number) => 158 - (value / max) * 128;
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  return <div className={`trend-chart${compact ? " trend-chart-compact" : ""}`}>
    <svg viewBox="0 0 640 195" role="img" aria-label={`${name} trend. ${labels.map((label, i) => `${label}: ${values[i]}`).join("; ")}`}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-brand-accent)" stopOpacity=".28" /><stop offset="100%" stopColor="var(--color-brand-accent)" stopOpacity="0" /></linearGradient></defs>
      {[0, .25, .5, .75, 1].map((ratio) => <g key={ratio}><line x1="38" x2="590" y1={158 - ratio * 128} y2={158 - ratio * 128} stroke="var(--color-chart-grid)" strokeDasharray="3 5" /><text x="25" y={162 - ratio * 128} textAnchor="end" className="chart-axis">{Math.round(max * ratio)}</text></g>)}
      {values.length > 0 && <><polygon points={`38,158 ${points} ${x(values.length - 1)},158`} fill={`url(#${id})`} /><polyline points={points} fill="none" stroke="var(--color-brand-accent)" strokeWidth="3" strokeLinejoin="round" /></>}
      {values.map((value, index) => <g key={labels[index]}>
        <circle cx={x(index)} cy={y(value)} r={active === index ? 6 : 4} fill="var(--color-background-surface)" stroke="var(--color-brand-accent)" strokeWidth="2.5" tabIndex={0} role="button" aria-label={`${labels[index]}: ${value} ${name.toLowerCase()}`} onFocus={() => setFocused(index)} onMouseEnter={() => setFocused(index)} onClick={() => setFocused(index)} onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setFocused(index); }
        }}><title>{labels[index]}: {value} {name.toLowerCase()}</title></circle>
        {(labels.length <= 8 || index % Math.ceil(labels.length / 7) === 0 || index === labels.length - 1) && <text x={x(index)} y="184" textAnchor="middle" className="chart-axis">{labels[index]}</text>}
      </g>)}
    </svg>
    <div className="chart-readout" aria-live="polite"><span className="chart-dot" style={{ background: "var(--color-brand-accent)" }} />{active >= 0 ? `${labels[active]}: ${values[active].toLocaleString()} ${name.toLowerCase()}` : "No scan activity yet"}</div>
  </div>;
}

export function RiskDonut({ data }: { data: { risk: Risk; value: number }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const [active, setActive] = useState<Risk | null>(null);
  const segments = data.filter((item) => item.value > 0);
  return <div className="donut-layout">
    <svg viewBox="0 0 190 190" className="donut-chart" role="img" aria-label={`File risk distribution: ${data.map((item) => `${item.risk}: ${item.value}`).join(", ")}`}>
      <circle cx="95" cy="95" r="70" fill="none" stroke="var(--color-chart-grid-subtle)" strokeWidth="19" />
      {segments.map((item, index) => {
        const start = total ? segments.slice(0, index).reduce((sum, previous) => sum + previous.value, 0) / total * 100 : 0;
        const percent = total ? (item.value / total) * 100 : 0;
        return <circle key={item.risk} cx="95" cy="95" r="70" pathLength="100" fill="none" stroke={RISK_COLORS[item.risk]} strokeWidth={active === item.risk ? 24 : 19} strokeDasharray={`${percent} ${100 - percent}`} strokeDashoffset={-start} transform="rotate(-90 95 95)" tabIndex={0} onFocus={() => setActive(item.risk)} onMouseEnter={() => setActive(item.risk)}>
          <title>{item.risk}: {item.value} files</title>
        </circle>;
      })}
      <text x="95" y="94" textAnchor="middle" className="donut-value">{total.toLocaleString()}</text>
      <text x="95" y="116" textAnchor="middle" className="chart-axis">files classified</text>
    </svg>
    <div className="donut-legend">
      {data.map((item) => <div className="legend-row" key={item.risk}><span className="chart-dot" style={{ background: RISK_COLORS[item.risk] }} /><span>{item.risk}</span><strong>{item.value.toLocaleString()}</strong></div>)}
      <p className="caption" aria-live="polite">{active ? `${active}: ${data.find((item) => item.risk === active)?.value || 0} files` : "Highest finding risk per file"}</p>
    </div>
  </div>;
}
