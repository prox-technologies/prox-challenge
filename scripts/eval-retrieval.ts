/**
 * Offline check: does vector search surface chunks containing expected keywords?
 * Run after `npm run extract`. Does not call Claude.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { searchKnowledge, knowledgeExists } from "../lib/agent/vector-search";

interface Bench {
  id: string;
  query: string;
  must_include: string[];
  filter_source?: string;
}

async function main() {
  if (!knowledgeExists()) {
    console.error("No knowledge DB. Run: npm run extract");
    process.exit(1);
  }

  const raw = fs.readFileSync(
    path.join(process.cwd(), "benchmark", "benchmarks.json"),
    "utf-8",
  );
  const items = JSON.parse(raw) as Bench[];

  let pass = 0;
  for (const b of items) {
    const hits = await searchKnowledge(
      b.query,
      5,
      b.filter_source ?? "all",
    );
    const text = hits.map((h) => h.text.toLowerCase()).join("\n");
    const missing = b.must_include.filter(
      (k) => !text.includes(k.toLowerCase()),
    );
    const ok = missing.length === 0;
    if (ok) pass++;
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${b.id}${ok ? "" : `  missing: ${missing.join(", ")}`}`,
    );
  }

  console.log(`\n${pass}/${items.length} passed`);
  process.exit(pass === items.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
