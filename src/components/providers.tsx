"use client";

import Script from "next/script";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Contrast, Moon, Sun } from "lucide-react";
import { Button, Message } from "./ui";

export type Theme = "light" | "dark" | "hc";
const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void }>({ theme: "light", setTheme: () => { throw new Error("Theme provider is missing."); } });

export function Providers({ children, initialTheme }: { children: ReactNode; initialTheme: Theme }) {
  const [theme, updateTheme] = useState(initialTheme);
  const [scriptError, setScriptError] = useState(false);
  function setTheme(next: Theme) {
    updateTheme(next);
    document.documentElement.dataset.theme = next;
    document.cookie = `minidsp-theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
  }
  return <ThemeContext.Provider value={{ theme, setTheme }}>
    <Script src="/vendor/lepidus.js" strategy="afterInteractive" onReady={() => {
      window.Lepidus?.init();
      window.dispatchEvent(new Event("lepidus-ready"));
    }} onError={() => setScriptError(true)} />
    {scriptError && <Message title="Interface controls could not load">Reload the page. The local Lepidus interaction asset is unavailable.</Message>}
    {children}
  </ThemeContext.Provider>;
}

export function ThemeControls() {
  const { theme, setTheme } = useContext(ThemeContext);
  return <div className="theme-controls" role="group" aria-label="Color theme">
    {([{ value: "light", label: "Light", Icon: Sun }, { value: "dark", label: "Dark", Icon: Moon }, { value: "hc", label: "High contrast", Icon: Contrast }] as const).map(({ value, label, Icon }) =>
      <Button key={value} small variant="secondary" aria-label={`${label} theme`} title={label} aria-pressed={theme === value} onClick={() => setTheme(value)}><Icon size={16} aria-hidden="true" /></Button>)}
  </div>;
}
