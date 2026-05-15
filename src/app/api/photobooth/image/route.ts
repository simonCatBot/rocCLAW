// MIT License - Copyright (c) 2026 kiritigowda
// See LICENSE file for details.

import { NextRequest, NextResponse } from "next/server";

const COMFYUI_API_URL = process.env.COMFYUI_API_URL || "http://127.0.0.1:8188";

// GET /api/photobooth/image?filename=xxx&subfolder=xxx&type=xxx
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const filename = params.get("filename");
  const subfolder = params.get("subfolder") ?? "";
  const type = params.get("type") ?? "output";

  if (!filename) {
    return NextResponse.json(
      { error: "filename query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const url = new URL(`${COMFYUI_API_URL}/view`);
    url.searchParams.set("filename", filename);
    if (subfolder) url.searchParams.set("subfolder", subfolder);
    url.searchParams.set("type", type);

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch image from ComfyUI" },
        { status: 502 }
      );
    }

    const contentType = res.headers.get("content-type") ?? "image/png";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch image" },
      { status: 503 }
    );
  }
}