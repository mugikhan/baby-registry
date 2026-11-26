function normalise(pathname: string): string {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // Keep the raw path: a malformed escape cannot match an admin route anyway.
  }
  return decoded.toLowerCase().replace(/\/{2,}/g, "/");
}

export function isAdminPath(pathname: string): boolean {
  const path = normalise(pathname);
  return (
    path === "/admin" ||
    path.startsWith("/admin/") ||
    path === "/api/admin" ||
    path.startsWith("/api/admin/")
  );
}
