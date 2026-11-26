const nonces = new WeakMap<Request, string>();

export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export function rememberNonce(request: Request, nonce: string): void {
  nonces.set(request, nonce);
}

export function nonceFor(request: Request): string | undefined {
  return nonces.get(request);
}

export function buildCsp(nonce: string, dev: boolean): string {
  const connect = dev ? "'self' ws: wss:" : "'self'";
  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com`,
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src ${connect}`,
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export const SECURITY_HEADERS = {
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
} as const;
