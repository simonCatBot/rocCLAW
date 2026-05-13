# Image Generation Demo Task

## Overview
A demonstration task showcasing AI image generation capabilities integrated with the main agent system. This task generates Disney-style character images with customizable themes and locations.

## Trigger
Activates on: "generate images", "create character art", "image demo", "disney cars images"

## Integration
- **Primary Agent**: Main orchestration agent
- **Sub-agent**: Image generation worker (ComfyUI skill)
- **Output**: Generated images viewable via ComfyUI API

## Workflow
1. Parse user request for character/theme/location
2. Validate ComfyUI server status
3. Spawn image generation sub-agent
4. Queue generation jobs
5. Poll for completion
6. Return image URLs

## Parameters
```json
{
  "characters": ["lightning-mcqueen", "mater", "sally", "doc-hudson", "luigi", "guido", "ramone", "flo", "sarge"],
  "locations": ["golden-gate", "fishermans-wharf", "lombard-street", "alcatraz", "chinatown", "painted-ladies", "haight-ashbury", "presidio"],
  "style": "disney-cars",
  "resolution": "1024x1024",
  "model": "sdxl-base-1.0"
}
```

## Example Usage
```
User: "Generate Disney Cars in San Francisco"
→ Task: image-generation-demo
→ Output: 8 images of characters at iconic SF locations
```

## Files
- `operations/imageGenerationWorkflow.ts` - Core workflow
- `components/ImageGenerationDemo.tsx` - UI component
- `api/generate/route.ts` - API endpoint

## Dependencies
- ComfyUI server running on 127.0.0.1:8188
- SDXL base 1.0 checkpoint
- ROCm-compatible GPU (AMD Radeon 8060S)
