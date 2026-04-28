/**
 * Runs retrieval eval in a child process. Some macOS + native addon combos
 * throw during process teardown even when checks pass; the child exit code
 * may be non-zero while stdout still shows PASS lines.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const r = spawnSync(
  process.execPath,
  [path.join(root, "node_modules/tsx/dist/cli.mjs"), "scripts/eval-retrieval.ts"],
  {
    encoding: "utf-8",
    maxBuffer: 20 * 1024 * 1024,
    cwd: root,
    env: process.env,
  },
);

if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);

const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
const failLine = out.split("\n").some((l) => l.startsWith("FAIL"));
const matches = [...out.matchAll(/(\d+)\/(\d+) passed/g)];
const m = matches.length ? matches[matches.length - 1] : null;
const allPass =
  m &&
  Number(m[1]) === Number(m[2]) &&
  Number(m[2]) > 0 &&
  !failLine;

process.exit(allPass ? 0 : 1);
