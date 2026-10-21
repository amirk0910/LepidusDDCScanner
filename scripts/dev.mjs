import { spawn } from "node:child_process";
import { createRequire } from "node:module";

// Corporate/antivirus TLS inspection re-signs HTTPS with a CA that only the OS trusts.
// Let Node use the OS certificate store so server-side Supabase calls verify normally.
const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
const options = [process.env.NODE_OPTIONS, "--use-system-ca"].filter(Boolean).join(" ");
const child = spawn(process.execPath, [nextBin, "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, NODE_OPTIONS: options },
});
child.on("exit", (code) => process.exit(code ?? 1));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
