import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Providers, type Theme } from "@/components/providers";
import "@fontsource/open-sans/400.css";
import "@fontsource/open-sans/600.css";
import "@fontsource/open-sans/700.css";
import "../../public/vendor/lepidus.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Lepide MiniDSP | Data discovery & classification", template: "%s | Lepide MiniDSP" },
  description: "A training workspace for discovering and classifying synthetic sensitive data. Masked findings, clear insights, and owner-isolated scan history.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const saved = (await cookies()).get("minidsp-theme")?.value;
  const theme: Theme = saved === "dark" || saved === "hc" ? saved : "light";
  return <html lang="en" data-theme={theme}>
    <body><a className="skip-link" href="#main-content">Skip to content</a><Providers initialTheme={theme}>{children}</Providers></body>
  </html>;
}
