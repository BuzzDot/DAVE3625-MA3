// Examine only files that would enter Git; never print matched secret values.
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
const files = [
  ...new Set(
    execFileSync(
      "git",
      [
        "ls-files",
        "--cached",
        ...(process.argv.includes("--tracked")
          ? []
          : ["--others", "--exclude-standard"]),
        "-z",
      ],
      { encoding: "utf8" },
    )
      .split("\0")
      .filter(Boolean),
  ),
];
const findings = [];
const privateFile =
  /(?:^|\/)(?:\.env(?!\.example$)(?:\..*)?|\.vercel|test-results|playwright-report|coverage|node_modules|\.next|\.temp)(?:\/|$)|\.(?:pem|p12|pfx|key|log|tsbuildinfo)$/i;
const patterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["Supabase secret", /\bsb_secret_[A-Za-z0-9_-]{20,}\b/],
  [
    "GitHub token",
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/,
  ],
  ["OpenAI secret", /\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}\b/],
  [
    "embedded JWT",
    /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  ],
  ["database password URL", /postgres(?:ql)?:\/\/[^\s:"']+:[^\s"'$`{]+@/],
];
for (const file of files) {
  if (privateFile.test(file)) {
    findings.push({
      file,
      kind: "private/generated file in publication candidate",
    });
    continue;
  }
  const body = await readFile(file, "utf8");
  for (const [kind, pattern] of patterns)
    if (pattern.test(body)) findings.push({ file, kind });
  const emails = body.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  if (
    emails.some(
      (email) =>
        !/@(?:example\.(?:com|org|net)|users\.noreply\.github\.com)$/i.test(
          email,
        ),
    )
  )
    findings.push({ file, kind: "review non-example email address" });
}
console.log(
  JSON.stringify(
    {
      candidateFiles: files.length,
      findings,
      scope: process.argv.includes("--tracked")
        ? "Git-tracked release files only; untracked user tools excluded. No secret values printed."
        : "Git-tracked and non-ignored untracked files; no secret values printed. Pattern scanning supplements manual review.",
    },
    null,
    2,
  ),
);
if (findings.length) process.exitCode = 1;
