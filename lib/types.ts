export type ManualSource =
  | "owner-manual"
  | "quick-start-guide"
  | "selection-chart";

export interface KnowledgeChunk {
  id: string;
  text: string;
  source: ManualSource;
  section: string;
  pages: number[];
  chunkType: "paragraph" | "table" | "spec" | "troubleshooting" | "figure";
  imageRefs: string[];
  hasVisualContent: boolean;
}

export interface KnowledgeRecord extends KnowledgeChunk {
  vector: number[];
}

export interface SearchResult {
  text: string;
  section: string;
  pages: number[];
  chunkType: string;
  imageRefs: string[];
  hasVisualContent: boolean;
  score: number;
}
