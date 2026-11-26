import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = "drizzle";
const BLOCKED_STATUSES = new Set(["M", "D", "R", "T"]);

const baseRef = process.argv[2] ?? "origin/main";
const problems: string[] = [];

const diff = execFileSync(
  "git",
  ["diff", "--name-status", "--no-renames", `${baseRef}...HEAD`, "--", MIGRATIONS_DIR],
  { encoding: "utf8" },
);

for (const line of diff.split("\n").filter(Boolean)) {
  const [status = "", file = ""] = line.split("\t");
  const isSql = file.endsWith(".sql") && path.dirname(file) === MIGRATIONS_DIR;
  if (isSql && BLOCKED_STATUSES.has(status.charAt(0))) {
    problems.push(
      `${file}: an existing migration changed (${status}). Add a new migration instead.`,
    );
  }
}

for (const name of readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith(".sql"))) {
  const sqlText = readFileSync(path.join(MIGRATIONS_DIR, name), "utf8");
  if (/pragma\s+foreign_keys/i.test(sqlText)) {
    problems.push(
      `${MIGRATIONS_DIR}/${name}: contains PRAGMA foreign_keys. D1 ignores it. Use PRAGMA defer_foreign_keys = on.`,
    );
  }
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`Migrations OK against ${baseRef}.`);
