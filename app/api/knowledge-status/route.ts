import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function GET() {
  const db = path.join(process.cwd(), "data", "knowledge.lance");
  const images = path.join(process.cwd(), "data", "images");
  const ready = fs.existsSync(db);
  let imageCount = 0;
  if (fs.existsSync(images)) {
    imageCount = fs.readdirSync(images).filter((f) => f.endsWith(".png")).length;
  }
  return NextResponse.json({ ready, imageCount });
}
