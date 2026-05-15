// MIT License - Copyright (c) 2026 kiritigowda
// See LICENSE file for details.

import { NextRequest, NextResponse } from "next/server";

const COMFYUI_API_URL = process.env.COMFYUI_API_URL || "http://127.0.0.1:8188";

interface JobStatus {
  status: "pending" | "running" | "success" | "error";
  images?: { filename: string; subfolder: string; type: string }[];
  error?: string;
}

// GET /api/photobooth/status?promptId=xxx - Check job status
export async function GET(request: NextRequest) {
  const promptId = request.nextUrl.searchParams.get("promptId");

  if (!promptId) {
    return NextResponse.json(
      { error: "promptId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${COMFYUI_API_URL}/history/${promptId}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      // History endpoint returns 404 when job is still pending/not found
      if (res.status === 404) {
        const status: JobStatus = { status: "pending" };
        return NextResponse.json(status);
      }
      return NextResponse.json(
        { error: "ComfyUI returned error", status: "error" } as JobStatus,
        { status: 502 }
      );
    }

    const history = await res.json();
    const entry = history[promptId];

    if (!entry) {
      const status: JobStatus = { status: "pending" };
      return NextResponse.json(status);
    }

    const jobStatus = entry.status?.status_str;

    if (jobStatus === "success") {
      // Extract output images
      const images: { filename: string; subfolder: string; type: string }[] = [];
      const outputs = entry.outputs ?? {};

      for (const nodeOutput of Object.values(outputs) as Record<string, unknown>[]) {
        const nodeImages = nodeOutput.images as Array<{ filename: string; subfolder: string; type: string }> | undefined;
        if (nodeImages) {
          images.push(...nodeImages);
        }
      }

      const status: JobStatus = { status: "success", images };
      return NextResponse.json(status);
    }

    if (jobStatus === "error") {
      const status: JobStatus = {
        status: "error",
        error: entry.status?.messages?.join("; ") ?? "Generation failed",
      };
      return NextResponse.json(status);
    }

    // Still running
    const status: JobStatus = { status: "running" };
    return NextResponse.json(status);
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Failed to check status", status: "error" } as JobStatus,
      { status: 503 }
    );
  }
}