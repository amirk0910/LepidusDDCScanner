"use client";

import { useState, type ReactNode } from "react";
import { ArrowDownUp, ChevronLeft, ChevronRight } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  value: (row: T) => string | number;
  render?: (row: T) => ReactNode;
}

export function RecordsTable<T>({ rows, columns, rowKey, caption, pageSize = 8, defaultSort = "date", paginate = true }: {
  rows: T[]; columns: Column<T>[]; rowKey: (row: T) => string; caption: string; pageSize?: number; defaultSort?: string; paginate?: boolean;
}) {
  const [sort, setSort] = useState({ key: defaultSort, descending: true });
  const [page, setPage] = useState(1);
  const column = columns.find((column) => column.key === sort.key);
  const sorted = [...rows].sort((a, b) => {
    if (!column) return 0;
    const av = column.value(a), bv = column.value(b);
    const comparison = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true });
    return sort.descending ? -comparison : comparison;
  });
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages);
  const visible = paginate ? sorted.slice((current - 1) * pageSize, current * pageSize) : sorted;
  return <div className="records">
    <div className="table-scroll">
      <div className="lp-table"><table className="lp-table__table">
        <caption className="sr-only">{caption}</caption>
        <thead><tr>{columns.map((item) => <th key={item.key} scope="col" className="lp-table__th" aria-sort={sort.key === item.key ? sort.descending ? "descending" : "ascending" : undefined}>
          <div className="lp-table__header-inner"><button type="button" className="lp-table__sort-button" onClick={() => { setSort({ key: item.key, descending: sort.key === item.key ? !sort.descending : false }); setPage(1); }}>
            <span className="lp-table__header-label">{item.label}</span><ArrowDownUp className={`lp-table__sort-arrow${sort.key === item.key ? " lp-table__sort-arrow--active" : ""}${sort.descending ? " lp-table__sort-arrow--desc" : ""}`} aria-hidden="true" />
          </button></div>
        </th>)}</tr></thead>
        <tbody>{visible.length ? visible.map((row) => <tr key={rowKey(row)}>{columns.map((item) => <td className="lp-table__td" key={item.key}><div className="lp-table__cell-inner"><span className="lp-table__cell-text">{item.render ? item.render(row) : item.value(row)}</span></div></td>)}</tr>) : <tr><td className="lp-table__empty-cell" colSpan={columns.length}>No matching records. Try clearing the filters.</td></tr>}</tbody>
      </table></div>
    </div>
    {paginate && <nav className="lp-pagination" aria-label={`${caption} pagination`}>
      <span className="lp-pagination__label">{rows.length ? (current - 1) * pageSize + 1 : 0}-{Math.min(current * pageSize, rows.length)} of {rows.length} records</span>
      <button type="button" className="lp-pagination__button" disabled={current === 1} aria-label="Previous page" onClick={() => setPage(current - 1)}><ChevronLeft size={16} aria-hidden="true" /></button>
      <span className="caption">Page {current} of {pages}</span>
      <button type="button" className="lp-pagination__button" disabled={current === pages} aria-label="Next page" onClick={() => setPage(current + 1)}><ChevronRight size={16} aria-hidden="true" /></button>
    </nav>}
  </div>;
}
