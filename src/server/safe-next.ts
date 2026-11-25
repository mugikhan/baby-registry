export function safeNext(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  const base = "http://same-site.invalid";
  try {
    const url = new URL(value, base);
    if (url.origin !== base || url.pathname === "/pin") return "/";
    return url.pathname + url.search;
  } catch {
    return "/";
  }
}
