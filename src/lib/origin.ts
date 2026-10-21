const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

// In local development the server may be bound to 127.0.0.1 while the browser uses localhost
// (or the reverse). Production always requires an exact origin match.
export function isTrustedOrigin(request: Request, development = process.env.NODE_ENV !== "production"): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const expected = new URL(request.url);
  if (origin === expected.origin) return true;
  if (!development) return false;
  try {
    const actual = new URL(origin);
    return actual.protocol === expected.protocol && actual.port === expected.port
      && LOOPBACK_HOSTS.has(actual.hostname) && LOOPBACK_HOSTS.has(expected.hostname);
  } catch {
    return false;
  }
}
