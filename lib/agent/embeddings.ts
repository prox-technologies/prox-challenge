import { pipeline } from "@huggingface/transformers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractor: any = null;

export const VECTOR_DIM = 384;

export async function embed(text: string): Promise<number[]> {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  const out = await extractor(text, { pooling: "mean", normalize: true });
  const data = out.data as Float32Array;
  return Array.from(data);
}
