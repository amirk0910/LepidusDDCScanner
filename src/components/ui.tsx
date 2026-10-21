"use client";

import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import Image from "next/image";
import { AlertCircle, ChevronDown, Inbox } from "lucide-react";
import type { Risk } from "@/lib/types";

declare global {
  interface Window { Lepidus?: { init: (root?: Element) => void } }
}

export function Brand({ compact = false, tone = "surface" }: { compact?: boolean; tone?: "surface" | "inverse" }) {
  return <span className={`brand brand-${tone}${compact ? " brand-compact" : ""}`}>
    {compact
      ? <Image className="brand-logo" src="/brand/lepide-mark.png" alt="Lepide" width={30} height={39} priority />
      : <><Image className="brand-logo" src="/brand/lepide-logo.png" alt="Lepide" width={150} height={39} priority /><span className="brand-product">MiniDSP</span></>}
  </span>;
}

export function Button({ variant = "primary", small = false, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "white"; small?: boolean }) {
  return <button type="button" className={`lp-button lp-button--${variant} lp-button--${small ? "sm" : "md"}`} {...props}>{children}</button>;
}

export function Panel({ title, actions, children, className = "" }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={className} aria-label={title}>
    <div className="lp-card">
      {title && <div className="lp-card__header">
        <div className="lp-card__title" role="heading" aria-level={2}>{title}</div>
        {actions && <div className="lp-card__actions">{actions}</div>}
      </div>}
      <div className="lp-card__body">{children}</div>
    </div>
  </section>;
}

export function RiskBadge({ risk }: { risk: Risk }) {
  const variant = { None: "neutral", Low: "success", Medium: "warning", High: "error", Critical: "error" }[risk];
  return <span className={`lp-badge lp-badge--${variant}`}><span className="lp-badge__dot" aria-hidden="true" />{risk}</span>;
}

export function Message({ title, children, variant = "error" }: { title: string; children: ReactNode; variant?: "error" | "info" | "success" | "warning" }) {
  return <div className={`lp-message lp-message--${variant}`} role={variant === "error" ? "alert" : "status"}>
    <span className="lp-message__icon"><AlertCircle aria-hidden="true" /></span>
    <div className="lp-message__content"><div className="lp-message__text">
      <h3 className="lp-message__title">{title}</h3>
      <p className="lp-message__body">{children}</p>
    </div></div>
  </div>;
}

export function Field({ label, error, helper, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; helper?: string }) {
  const message = error || helper;
  return <div className="lp-input lp-input--full-width">
    <div className="lp-input__row lp-input__row--label-top">
      <label className="lp-input__label" htmlFor={id}>{label}</label>
      <div className={`lp-input__field${error ? " lp-input__field--error" : ""}`}>
        <input className="lp-input__input" id={id} aria-invalid={!!error} aria-describedby={message ? `${id}-message` : undefined} {...props} />
      </div>
    </div>
    {message && <p id={`${id}-message`} className={`lp-input__message${error ? " lp-input__message--error" : ""}`}>{message}</p>}
  </div>;
}

export function Checkbox({ children, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <label className={`lp-checkbox${props.disabled ? " lp-checkbox--disabled" : ""}`}>
    <span className="lp-checkbox__control">
      <input className="lp-checkbox__input" type="checkbox" {...props} />
      <span className="lp-checkbox__box" aria-hidden="true">
        <svg className="lp-checkbox__check" viewBox="0 0 10 8" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 4.2 3.8 7 9 1" /></svg>
        <svg className="lp-checkbox__dash" viewBox="0 0 10 2" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 1h8" /></svg>
      </span>
    </span>
    <span className="lp-checkbox__label">{children}</span>
  </label>;
}

export function Dropdown({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const init = () => window.Lepidus?.init(element.parentElement || element);
    const change = (event: Event) => {
      if (event instanceof CustomEvent && event.detail.option instanceof HTMLElement) {
        const selected = event.detail.option.dataset.value;
        if (selected !== undefined) onChange(selected);
      }
    };
    init();
    window.addEventListener("lepidus-ready", init);
    element.addEventListener("lp-dropdown-change", change);
    return () => {
      window.removeEventListener("lepidus-ready", init);
      element.removeEventListener("lp-dropdown-change", change);
    };
  }, [onChange]);
  const selected = options.find((option) => option.value === value)?.label || label;
  return <div className="lp-dropdown" data-lp-dropdown="single" ref={ref}>
    <button type="button" className="lp-dropdown__trigger" aria-label={`${label}: ${selected}`} aria-expanded="false" aria-haspopup="listbox">
      <span className="lp-dropdown__trigger-label">{selected}</span><ChevronDown className="lp-dropdown__chevron" aria-hidden="true" />
    </button>
    <div className="lp-dropdown__panel" hidden>
      <div className="lp-dropdown__header"><span className="lp-dropdown__header-label">{label}</span><ChevronDown className="lp-dropdown__chevron lp-dropdown__chevron--open" aria-hidden="true" /></div>
      <div className="lp-dropdown__list" role="listbox" aria-label={label}>
        {options.map((option) => <button key={option.value} type="button" className="lp-dropdown__option" role="option" data-value={option.value} aria-selected={option.value === value}>
          <span className="lp-dropdown__option-label">{option.label}</span>
        </button>)}
      </div>
    </div>
  </div>;
}

export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="lp-empty-state">
    <span className="lp-empty-state__illustration"><Inbox aria-hidden="true" size={64} /></span>
    <p className="lp-empty-state__message">{children}</p>
    {action && <div className="lp-empty-state__action">{action}</div>}
  </div>;
}
