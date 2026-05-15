// MIT License - Copyright (c) 2026 kiritigowda
// See LICENSE file for details.

import { NextResponse } from "next/server";
import { bootstrapDomainRuntime } from "@/lib/controlplane/runtime-route-bootstrap";

export const runtime = "nodejs";

// GET /api/gateway-info - Fetch gateway system-presence info
export async function GET() {
  const runtimeBootstrap = await bootstrapDomainRuntime();
  
  if (runtimeBootstrap.kind === "mode-disabled") {
    return NextResponse.json({ error: "API mode is disabled" }, { status: 503 });
  }
  if (runtimeBootstrap.kind === "runtime-init-failed") {
    return NextResponse.json({ error: "Runtime initialization failed", details: runtimeBootstrap.failure }, { status: 503 });
  }
  if (runtimeBootstrap.kind === "start-failed") {
    return NextResponse.json({ error: "Runtime start failed", details: runtimeBootstrap.message }, { status: 503 });
  }
  if (runtimeBootstrap.kind !== "ready") {
    return NextResponse.json({ error: "Gateway not available", kind: (runtimeBootstrap as { kind?: string }).kind }, { status: 503 });
  }
  
  const controlPlane = runtimeBootstrap.runtime;
  
  try {
    // Fetch system-presence from gateway (returns array of presence entries)
    const presenceResult = await controlPlane.callGateway("system-presence", {}) as Array<{
      host?: string;
      mode?: string;
      deviceId?: string;
      instanceId?: string;
      version?: string;
    }> | undefined;

    // Extract the gateway's own presence entry (first one, or the one with mode === "gateway")
    const selfEntry = Array.isArray(presenceResult)
      ? presenceResult.find((entry) => entry.mode === "gateway") ?? presenceResult[0]
      : undefined;

    return NextResponse.json({
      connected: true,
      presence: selfEntry,
      presenceEntries: presenceResult,
    });
  } catch (error) {
    console.error("[gateway-info] Failed to fetch gateway info:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { connected: false, error: errorMessage },
      { status: 200 } // Return 200 even on error, caller can check connected flag
    );
  }
}
