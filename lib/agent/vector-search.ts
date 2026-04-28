import * as lancedb from "@lancedb/lancedb";
import * as arrow from "apache-arrow";
import fs from "fs";
import path from "path";
import type { KnowledgeRecord, SearchResult } from "@/lib/types";
import { embed, VECTOR_DIM } from "./embeddings";

const DB_PATH = path.join(process.cwd(), "data", "knowledge.lance");
const TABLE_NAME = "knowledge";

let table: lancedb.Table | null = null;
let db: lancedb.Connection | null = null;

async function getTable(): Promise<lancedb.Table> {
  if (!table) {
    db = await lancedb.connect(DB_PATH);
    table = await db.openTable(TABLE_NAME);
  }
  return table;
}

export async function searchKnowledge(
  query: string,
  topK = 5,
  filterSource?: string,
): Promise<SearchResult[]> {
  const queryEmbedding = await embed(query);
  const tbl = await getTable();
  let search = tbl.search(queryEmbedding).limit(topK);

  if (filterSource && filterSource !== "all") {
    search = search.where(`source = '${filterSource}'`);
  }

  const results = await search.toArray();
  return results.map((r) => ({
    text: r.text as string,
    section: r.section as string,
    pages: JSON.parse(r.pages as string) as number[],
    chunkType: r.chunkType as string,
    imageRefs: JSON.parse(r.imageRefs as string) as string[],
    hasVisualContent: r.hasVisualContent as boolean,
    score: r._distance as number,
  }));
}

export async function storeChunks(chunks: KnowledgeRecord[]): Promise<void> {
  const dbConn = await lancedb.connect(DB_PATH);

  const schema = new arrow.Schema([
    new arrow.Field("id", new arrow.Utf8()),
    new arrow.Field("text", new arrow.Utf8()),
    new arrow.Field("source", new arrow.Utf8()),
    new arrow.Field("section", new arrow.Utf8()),
    new arrow.Field("pages", new arrow.Utf8()),
    new arrow.Field("chunkType", new arrow.Utf8()),
    new arrow.Field("imageRefs", new arrow.Utf8()),
    new arrow.Field("hasVisualContent", new arrow.Bool()),
    new arrow.Field(
      "vector",
      new arrow.FixedSizeList(
        VECTOR_DIM,
        new arrow.Field("item", new arrow.Float32(), true),
      ),
    ),
  ]);

  const records = chunks.map((chunk) => ({
    id: chunk.id,
    text: chunk.text,
    source: chunk.source,
    section: chunk.section,
    pages: JSON.stringify(chunk.pages),
    chunkType: chunk.chunkType,
    imageRefs: JSON.stringify(chunk.imageRefs),
    hasVisualContent: chunk.hasVisualContent,
    vector: chunk.vector,
  }));

  const arrowTable = lancedb.makeArrowTable(records, { schema });
  await dbConn.createTable(TABLE_NAME, arrowTable, { mode: "overwrite" });

  const tbl = await dbConn.openTable(TABLE_NAME);
  try {
    await tbl.createIndex("vector", {
      config: lancedb.Index.ivfPq({ numPartitions: 4, numSubVectors: 16 }),
    });
  } catch {
    console.log(
      "Note: vector index creation skipped (small dataset). Flat search still works.",
    );
  }
}

export function knowledgeExists(): boolean {
  return fs.existsSync(DB_PATH);
}
