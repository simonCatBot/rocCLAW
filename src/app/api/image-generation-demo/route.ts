// MIT License - Copyright (c) 2026 SimonCatBot
// See LICENSE file for details.

import { NextRequest, NextResponse } from "next/server";
import {
  runImageGenerationDemo,
  checkComfyUIStatus,
  startComfyUI,
  CHARACTER_TEMPLATES,
  LOCATION_TEMPLATES,
} from "@/features/image-generation/operations/imageGenerationWorkflow";

/**
 * GET /api/image-generation-demo
 * Check status and get available characters/locations
 */
export async function GET() {
  const status = await checkComfyUIStatus();

  return NextResponse.json({
    comfyui: {
      online: status.online,
      version: status.version,
    },
    characters: Object.entries(CHARACTER_TEMPLATES).map(([id, char]) => ({
      id,
      name: char.name,
      color: char.color,
    })),
    locations: Object.entries(LOCATION_TEMPLATES).map(([id, loc]) => ({
      id,
      name: loc.name,
    })),
  });
}

/**
 * POST /api/image-generation-demo
 * Run the image generation demo task
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      characters = ["lightning-mcqueen", "mater", "sally", "doc-hudson"],
      locations = [],
      count = 4,
      width = 1024,
      height = 1024,
      steps = 30,
      characterMode = "presets",
      customCharacterDescription = "",
    } = body;

    // Handle custom character mode
    let validCharacters: string[];
    if (characterMode === "custom" && customCharacterDescription?.trim()) {
      // For custom mode, use a special character ID
      validCharacters = ["custom-character"];
    } else {
      // Validate preset characters
      validCharacters = characters.filter(
        (c: string) => c in CHARACTER_TEMPLATES
      );
    }

    // Validate locations
    const validLocations = locations.filter(
      (l: string) => l in LOCATION_TEMPLATES
    );

    if (validCharacters.length === 0) {
      return NextResponse.json(
        { error: "No valid characters specified" },
        { status: 400 }
      );
    }

    // Start generation
    const result = await runImageGenerationDemo({
      characters: validCharacters,
      locations: validLocations.length > 0 ? validLocations : undefined,
      count,
      width,
      height,
      steps,
      customCharacterDescription: characterMode === "custom" ? customCharacterDescription : undefined,
    });

    // Build response with image URLs
    const jobsWithUrls = result.jobs.map((job) => ({
      ...job,
      imageUrl: job.filename
        ? `http://127.0.0.1:8188/view?filename=${encodeURIComponent(
            job.filename
          )}&type=output`
        : undefined,
    }));

    return NextResponse.json({
      success: true,
      summary: {
        total: result.jobs.length,
        successful: result.successful,
        failed: result.failed,
      },
      jobs: jobsWithUrls,
    });
  } catch (error) {
    console.error("Image generation demo error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/image-generation-demo
 * Start ComfyUI if not running
 */
export async function PUT() {
  const result = await startComfyUI();
  return NextResponse.json(result);
}
