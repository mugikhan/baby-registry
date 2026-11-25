import { execFileSync } from "node:child_process";

export default function globalSetup() {
  execFileSync(
    "pnpm",
    ["exec", "wrangler", "d1", "execute", "DB", "--local", "--command", "DELETE FROM rate_limits"],
    { stdio: "ignore" },
  );
}
