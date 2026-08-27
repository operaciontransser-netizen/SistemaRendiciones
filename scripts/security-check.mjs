import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const stagedOnly = process.argv.includes("--staged");

const forbiddenNames = [
  /(^|\/)\.env$/i,
  /(^|\/)\.env\.(?!example$)/i,
  /(^|\/)(?:credentials?|secrets?)(?:\.|\/|$)/i,
  /(^|\/)app script\.txt$/i,
  /\.(?:pem|key|p12|pfx|zip|csv|xlsx?|docx|pdf)$/i
];

const secretPatterns = [
  ["Token de Meta", /EAA[A-Za-z0-9]{20,}/g],
  ["Token de GitHub", /gh[pousr]_[A-Za-z0-9]{20,}/g],
  ["Clave de Google API", /AIza[0-9A-Za-z_-]{30,}/g],
  ["Clave privada", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ["Bearer fijo", /Bearer\s+[A-Za-z0-9._~-]{20,}/gi],
  ["JWT fijo", /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g]
];

function gitFiles(args) {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" })
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function listFiles() {
  if (stagedOnly) {
    return gitFiles(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]);
  }

  try {
    const tracked = gitFiles(["ls-files"]);
    const untracked = gitFiles(["ls-files", "--others", "--exclude-standard"]);
    return [...new Set([...tracked, ...untracked])];
  } catch {
    return [];
  }
}

const findings = [];

for (const relative of listFiles()) {
  const normalized = relative.replaceAll("\\", "/");
  if (forbiddenNames.some((pattern) => pattern.test(normalized))) {
    findings.push(`${normalized}: archivo no permitido en el repositorio publico`);
    continue;
  }

  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute) || fs.statSync(absolute).size > 5_000_000) continue;

  let content;
  try {
    content = fs.readFileSync(absolute, "utf8");
  } catch {
    continue;
  }

  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const [label, pattern] of secretPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) findings.push(`${normalized}:${index + 1}: posible ${label}`);
    }
  });
}

if (findings.length) {
  console.error("Revision de seguridad rechazada:\n" + findings.join("\n"));
  process.exit(1);
}

console.log(`Revision de seguridad aprobada (${stagedOnly ? "staged" : "archivos locales"}).`);
