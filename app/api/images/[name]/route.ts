import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  if (!/^[\w.-]+\.png$/.test(name)) {
    return new NextResponse("Bad request", { status: 400 });
  }
  const fp = path.join(process.cwd(), "data", "images", name);
  if (!fs.existsSync(fp)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const buf = fs.readFileSync(fp);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
