// MIT License - Copyright (c) 2026 SimonCatBot
// See LICENSE file for details.

import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

const COMFYUI_DIR = "/home/kiriti/ComfyUI";
const COMFYUI_PORT = 8188;

// Track if we're already starting ComfyUI to prevent duplicate starts
let isStarting = false;
let startPromise: Promise<{ success: boolean; message: string }> | null = null;

async function waitForComfyUI(timeoutMs = 60000): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${COMFYUI_PORT}/system_stats`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) return true;
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function startComfyUI(): Promise<{ success: boolean; message: string }> {
  if (isStarting && startPromise) {
    return startPromise;
  }

  isStarting = true;
  startPromise = (async () => {
    try {
      // First check if ComfyUI is already running
      try {
        const res = await fetch(`http://127.0.0.1:${COMFYUI_PORT}/system_stats`, {
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          return { success: true, message: "ComfyUI is already running" };
        }
      } catch {
        // Not running, continue to start
      }

      // Start ComfyUI
      const pythonPath = path.join(COMFYUI_DIR, "venv", "bin", "python");
      const args = [
        "main.py",
        "--listen", "127.0.0.1",
        "--port", String(COMFYUI_PORT),
        "--enable-cors-header",
      ];

      const child = spawn(pythonPath, args, {
        cwd: COMFYUI_DIR,
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
      });

      // Log output for debugging
      child.stdout?.on("data", (data) => {
        console.log("[ComfyUI]", data.toString().trim());
      });
      child.stderr?.on("data", (data) => {
        console.error("[ComfyUI]", data.toString().trim());
      });

      child.unref();

      // Wait for ComfyUI to be ready
      const isReady = await waitForComfyUI(60000);

      if (isReady) {
        return { success: true, message: "ComfyUI started successfully" };
      } else {
        return {
          success: false,
          message: "ComfyUI did not become ready within 60 seconds",
        };
      }
    } catch (error) {
      console.error("Failed to start ComfyUI:", error);
      return {
        success: false,
        message: `Failed to start ComfyUI: ${error instanceof Error ? error.message : String(error)}`,
      };
    } finally {
      isStarting = false;
      startPromise = null;
    }
  })();

  return startPromise;
}

export async function POST() {
  const result = await startComfyUI();
  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  });
}
