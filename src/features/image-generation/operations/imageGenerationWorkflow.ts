// MIT License - Copyright (c) 2026 SimonCatBot
// See LICENSE file for details.

/**
 * Image Generation Demo Workflow
 * 
 * A demonstration task for generating Disney-style character images.
 * Links to the main agent for orchestration.
 */

import { spawn } from "child_process";
import path from "path";

const COMFYUI_URL = process.env.COMFYUI_API_URL || "http://127.0.0.1:8188";
const COMFYUI_DIR = "/home/kiriti/ComfyUI";

export interface GenerationJob {
  character: string;
  location: string;
  prompt: string;
  negativePrompt: string;
  filename?: string;
  status: "pending" | "queued" | "running" | "success" | "error";
  error?: string;
}

export interface DemoTaskConfig {
  characters: string[];
  locationTheme?: string;
  locations?: string[];
  count?: number;
  width?: number;
  height?: number;
  steps?: number;
  customCharacterDescription?: string;
}

// Character and location templates
const CHARACTER_TEMPLATES: Record<string, { name: string; description: string; color: string }> = {
  "robin-hood": {
    name: "Robin Hood",
    description: "legendary outlaw in green tunic and feathered cap, skilled archer with bow and arrow",
    color: "green-brown"
  },
  "medusa": {
    name: "Medusa",
    description: "Greek Gorgon with living venomous snakes for hair, petrifying gaze, and serpentine lower body",
    color: "green-gold"
  },
  "dracula": {
    name: "Dracula",
    description: "classic vampire count in black cape and formal suit with fangs and pale skin",
    color: "black-red"
  },
  "frankenstein": {
    name: "Frankenstein's Monster",
    description: "green stitched creature with bolts in neck, flat head, and lumbering gait",
    color: "green-grey"
  },
  "sherlock": {
    name: "Sherlock Holmes",
    description: "brilliant detective in deerstalker hat and Inverness coat with pipe and magnifying glass",
    color: "brown-grey"
  },
  "alice": {
    name: "Alice",
    description: "curious young girl in blue dress with white apron and black hair band",
    color: "blue-white"
  },
  "peter-pan": {
    name: "Peter Pan",
    description: "boy who never grows up in green tunic and feathered cap, can fly with fairy dust",
    color: "green"
  },
  "hercules": {
    name: "Hercules",
    description: "strongest Greek hero with muscular build, lion skin cloak, and olive wreath",
    color: "gold-brown"
  },
  "anubis": {
    name: "Anubis",
    description: "Egyptian god of the afterlife with black jackal head, golden jewelry, and ceremonial staff",
    color: "black-gold"
  },
  "bigfoot": {
    name: "Bigfoot",
    description: "elusive tall hairy forest creature with large feet, dark brown fur, and humanoid shape",
    color: "brown"
  },
  "mermaid": {
    name: "The Little Mermaid",
    description: "half-human half-fish creature with flowing hair, seashell top, and shimmering tail",
    color: "green-blue"
  },
  "dragon": {
    name: "European Dragon",
    description: "winged fire-breathing beast with scales, horns, sharp claws, and treasure hoard",
    color: "red-green"
  }
};

const LOCATION_TEMPLATES: Record<string, { name: string; description: string; landmark: string }> = {
  "golden-gate": {
    name: "Golden Gate Bridge",
    description: "iconic orange suspension bridge spanning San Francisco Bay",
    landmark: "Golden Gate Bridge"
  },
  "fishermans-wharf": {
    name: "Fisherman's Wharf",
    description: "bustling waterfront with seafood restaurants and sea lions",
    landmark: "pier"
  },
  "lombard-street": {
    name: "Lombard Street",
    description: "world's crookedest street with winding curves and flower gardens",
    landmark: "winding street"
  },
  "alcatraz": {
    name: "Alcatraz Island",
    description: "infamous former prison island in San Francisco Bay",
    landmark: "prison building"
  },
  "chinatown": {
    name: "Chinatown",
    description: "vibrant neighborhood with pagoda gates and red lanterns",
    landmark: "Dragon Gate"
  },
  "painted-ladies": {
    name: "Painted Ladies",
    description: "colorful Victorian houses on Alamo Square",
    landmark: "Victorian houses"
  },
  "haight-ashbury": {
    name: "Haight-Ashbury",
    description: "historic hippie district with psychedelic vibes",
    landmark: "colorful Victorians"
  },
  "presidio": {
    name: "The Presidio",
    description: "scenic military park with Golden Gate views",
    landmark: "forest and bridge views"
  },
  "coit-tower": {
    name: "Coit Tower",
    description: "art deco tower on Telegraph Hill",
    landmark: "white tower"
  },
  "cable-cars": {
    name: "Cable Cars",
    description: "historic moving landmarks climbing steep hills",
    landmark: "cable car tracks"
  }
};

/**
 * Build prompt for a character at a location
 */
export function buildPrompt(characterId: string, locationId: string, customCharacterDescription?: string): { prompt: string; negative: string } {
  const character = CHARACTER_TEMPLATES[characterId];
  const location = LOCATION_TEMPLATES[locationId];

  if (!location) {
    throw new Error(`Invalid location '${locationId}'`);
  }

  let prompt: string;
  if (characterId === "custom-character" && customCharacterDescription) {
    // Custom character mode
    prompt = `${customCharacterDescription}, posing proudly in front of ${location.name}, ${location.description}, ${location.landmark} visible in background, photorealistic 3D render, cinematic lighting, Pixar style, vibrant colors, detailed environment`;
  } else if (character) {
    // Preset character mode - improved prompts for better recognition
    prompt = `${character.name}, ${character.description}, full body shot, posing proudly in front of ${location.name}, ${location.description}, ${location.landmark} visible in background, photorealistic 3D render, cinematic lighting, vibrant colors, detailed environment, high quality`;
  } else {
    throw new Error(`Invalid character '${characterId}'`);
  }

  const negative = "blurry, distorted, low quality, deformed, ugly, extra wheels, wrong proportions, bad anatomy, mutated, disfigured, duplicate, watermark, signature, text, logo";

  return { prompt, negative };
}

/**
 * Check if ComfyUI is running
 */
export async function checkComfyUIStatus(): Promise<{ online: boolean; version?: string }> {
  try {
    const res = await fetch(`${COMFYUI_URL}/system_stats`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      return { online: true, version: data.system?.comfyui_version };
    }
    return { online: false };
  } catch {
    return { online: false };
  }
}

/**
 * Start ComfyUI if not running
 */
export async function startComfyUI(): Promise<{ success: boolean; message: string }> {
  const status = await checkComfyUIStatus();
  if (status.online) {
    return { success: true, message: `ComfyUI already running (v${status.version})` };
  }

  // Parse COMFYUI_API_URL to get host and port
  const comfyUrl = new URL(COMFYUI_URL);
  const host = comfyUrl.hostname || "127.0.0.1";
  const port = comfyUrl.port || "8188";

  // Start ComfyUI process
  return new Promise((resolve) => {
    const pythonPath = path.join(COMFYUI_DIR, "venv", "bin", "python");
    const child = spawn(pythonPath, [
      "main.py",
      "--listen", host,
      "--port", port,
      "--enable-cors-header",
    ], {
      cwd: COMFYUI_DIR,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.unref();

    // Wait for server to be ready
    let attempts = 0;
    const maxAttempts = 60;
    const checkInterval = setInterval(async () => {
      attempts++;
      const status = await checkComfyUIStatus();
      if (status.online) {
        clearInterval(checkInterval);
        resolve({ success: true, message: "ComfyUI started successfully" });
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        resolve({ success: false, message: "ComfyUI did not start within 60 seconds" });
      }
    }, 1000);
  });
}

/**
 * Generate a single image
 */
export async function generateImage(
  job: GenerationJob,
  options: { width?: number; height?: number; steps?: number; seed?: number } = {}
): Promise<{ success: boolean; filename?: string; error?: string }> {
  const width = options.width || 1024;
  const height = options.height || 1024;
  const steps = options.steps || 30;
  const seed = options.seed ?? Math.floor(Math.random() * 1000000);

  const workflow = {
    "3": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: "sd_xl_base_1.0.safetensors" },
    },
    "4": {
      class_type: "CLIPTextEncode",
      inputs: { text: job.prompt, clip: ["3", 1] },
    },
    "5": {
      class_type: "CLIPTextEncode",
      inputs: { text: job.negativePrompt, clip: ["3", 1] },
    },
    "6": {
      class_type: "EmptyLatentImage",
      inputs: { width, height, batch_size: 1 },
    },
    "7": {
      class_type: "KSampler",
      inputs: {
        model: ["3", 0],
        seed,
        steps,
        cfg: 7.5,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 1.0,
        positive: ["4", 0],
        negative: ["5", 0],
        latent_image: ["6", 0],
      },
    },
    "8": {
      class_type: "VAEDecode",
      inputs: { samples: ["7", 0], vae: ["3", 2] },
    },
    "9": {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: `cars_${job.character}_${job.location}_`,
        images: ["8", 0],
      },
    },
  };

  try {
    // Queue the job
    const res = await fetch(`${COMFYUI_URL}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      return { success: false, error: `Failed to queue: ${res.status}` };
    }

    const data = await res.json();
    const promptId = data.prompt_id;

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 180; // 3 minutes

    while (attempts < maxAttempts) {
      attempts++;
      await new Promise((r) => setTimeout(r, 1000));

      const statusRes = await fetch(`${COMFYUI_URL}/history/${promptId}`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!statusRes.ok) continue;

      const history = await statusRes.json();
      if (!history[promptId]) {
        continue;
      }

      const entry = history[promptId];
      const status = entry.status?.status_str;

      if (status === "success") {
        const outputs = entry.outputs || {};
        console.log("[ImageGen] Success - outputs:", Object.keys(outputs));
        for (const [nodeId, output] of Object.entries(outputs) as [string, { images?: { filename: string }[] }][]) {
          if (output.images?.length > 0) {
            console.log("[ImageGen] Found image:", output.images[0].filename);
            return { success: true, filename: output.images[0].filename };
          }
        }
        return { success: false, error: "No images in output" };
      } else if (status === "error") {
        console.log("[ImageGen] Error status from ComfyUI");
        return { success: false, error: "Generation failed" };
      }
    }

    return { success: false, error: "Timeout waiting for completion" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Run the full demo task
 */
export async function runImageGenerationDemo(
  config: DemoTaskConfig,
  onProgress?: (job: GenerationJob, index: number, total: number) => void
): Promise<{ jobs: GenerationJob[]; successful: number; failed: number }> {
  // Ensure ComfyUI is running
  const comfyStatus = await checkComfyUIStatus();
  if (!comfyStatus.online) {
    const startResult = await startComfyUI();
    if (!startResult.success) {
      throw new Error(`Cannot start ComfyUI: ${startResult.message}`);
    }
  }

  // Build jobs
  const jobs: GenerationJob[] = [];
  const count = Math.min(config.count || config.characters.length, config.characters.length);

  for (let i = 0; i < count; i++) {
    const charId = config.characters[i % config.characters.length];
    // Use provided locations or cycle through all
    const locId = config.locations?.length 
      ? config.locations[i % config.locations.length] 
      : Object.keys(LOCATION_TEMPLATES)[i % Object.keys(LOCATION_TEMPLATES).length];

    const { prompt, negative } = buildPrompt(charId, locId, config.customCharacterDescription);

    jobs.push({
      character: charId,
      location: locId,
      prompt,
      negativePrompt: negative,
      status: "pending",
    });
  }

  // Run generation
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    job.status = "running";
    onProgress?.(job, i, jobs.length);

    const result = await generateImage(job, {
      width: config.width,
      height: config.height,
      steps: config.steps,
    });

    if (result.success) {
      job.status = "success";
      job.filename = result.filename;
      successful++;
    } else {
      job.status = "error";
      job.error = result.error;
      failed++;
    }

    onProgress?.(job, i, jobs.length);
  }

  return { jobs, successful, failed };
}

// Export all templates for UI use
export { CHARACTER_TEMPLATES, LOCATION_TEMPLATES };
