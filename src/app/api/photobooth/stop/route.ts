// MIT License - Copyright (c) 2026 kiritigowda
// See LICENSE file for details.

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const COMFYUI_URL = process.env.COMFYUI_API_URL || "http://127.0.0.1:8188";

async function findComfyUIPid(): Promise<string | null> {
  try {
    // Check if ComfyUI is running first
    try {
      const res = await fetch(`${COMFYUI_URL}/system_stats`, {
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) return null;
    } catch {
      return null;
    }

    // Find the specific ComfyUI python process
    const procDir = "/proc";
    const entries = await fs.promises.readdir(procDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pidNum = parseInt(entry.name, 10);
      if (isNaN(pidNum)) continue;
      
      try {
        const cmdlinePath = path.join(procDir, entry.name, "cmdline");
        const cmdline = await fs.promises.readFile(cmdlinePath, "utf-8").catch(() => "");
        
        // Check if this is the ComfyUI main.py process
        if (cmdline.includes("ComfyUI") && cmdline.includes("main.py")) {
          return entry.name;
        }
      } catch {
        // Process might have exited, skip
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

async function stopComfyUI(): Promise<{ success: boolean; message: string }> {
  try {
    const pid = await findComfyUIPid();
    
    if (!pid) {
      return { success: true, message: "ComfyUI is not running" };
    }

    const pidNum = parseInt(pid, 10);

    // Send SIGTERM first
    try {
      process.kill(pidNum, "SIGTERM");
    } catch {
      // If SIGTERM fails, try SIGKILL
      try {
        process.kill(pidNum, "SIGKILL");
      } catch {
        return {
          success: false,
          message: "Failed to send stop signal to ComfyUI",
        };
      }
    }

    // Wait a moment and verify it's stopped
    await new Promise((r) => setTimeout(r, 2000));
    
    // Verify it's stopped by checking port
    try {
      await fetch(`${COMFYUI_URL}/system_stats`, {
        signal: AbortSignal.timeout(1000),
      });
      // If we get here, it's still running
      return { success: false, message: "ComfyUI is still running after stop signal" };
    } catch {
      // Good - it's stopped
      return { success: true, message: "ComfyUI stopped successfully" };
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to stop ComfyUI: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function POST() {
  const result = await stopComfyUI();
  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  });
}
