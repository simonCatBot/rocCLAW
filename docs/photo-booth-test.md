# Testing Guide — ComfyUI Image Generation

Quick commands to verify ComfyUI is working and generate test images via API.

---

## Prerequisites

- ComfyUI running on `http://127.0.0.1:8188`
- SDXL model downloaded to `~/ComfyUI/models/checkpoints/sd_xl_base_1.0.safetensors`
- `curl` and `python3` available

---

## 1. Verify ComfyUI Status

```bash
curl -s http://127.0.0.1:8188/system_stats | python3 -m json.tool
```

**Expected output:**
```json
{
    "system": {
        "comfyui_version": "0.21.1",
        "pytorch_version": "2.10.0+rocm7.12.0",
        "python_version": "3.12.3 ..."
    },
    "devices": [
        {
            "name": "cuda:0 Radeon 8060S Graphics : native",
            "vram_total": 50500915200,
            "vram_free": 50496684032
        }
    ]
}
```

---

## 2. Verify PyTorch GPU Works

```bash
source ~/ComfyUI-venv/bin/activate
python3 -c "
import torch
x = torch.randn(100, 100, device='cuda')
y = x @ x.T
print('GPU OK:', y.shape)
"
```

**Expected:** `GPU OK: torch.Size([100, 100])`

---

## 3. Basic Image Generation (Text-to-Image)

```bash
curl -s -X POST http://127.0.0.1:8188/prompt \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": {
      "3": {"class_type": "KSampler", "inputs": {"seed": 42, "steps": 5, "cfg": 7.0, "sampler_name": "euler", "scheduler": "normal", "denoise": 1.0, "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0]}},
      "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"}},
      "5": {"class_type": "EmptyLatentImage", "inputs": {"width": 512, "height": 512, "batch_size": 1}},
      "6": {"class_type": "CLIPTextEncode", "inputs": {"text": "a simple test image", "clip": ["4", 1]}},
      "7": {"class_type": "CLIPTextEncode", "inputs": {"text": "", "clip": ["4", 1]}},
      "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
      "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": "test_output", "images": ["8", 0]}}
    }
  }'
```

**Check result:**
```bash
ls -lt ~/ComfyUI/output/test_output_*.png
```

---

## 4. Style Transfer (Image-to-Image)

### 4a. Prepare Input Image

```bash
# Copy image to ComfyUI input directory
cp /path/to/your/image.png ~/ComfyUI/input/source.png
```

### 4b. Picasso Style

```bash
curl -s -X POST http://127.0.0.1:8188/prompt \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": {
      "1": {"class_type": "LoadImage", "inputs": {"image": "source.png"}},
      "2": {"class_type": "VAEEncode", "inputs": {"pixels": ["1", 0], "vae": ["4", 2]}},
      "3": {"class_type": "KSampler", "inputs": {"seed": 88, "steps": 30, "cfg": 8.5, "sampler_name": "euler_ancestral", "scheduler": "karras", "denoise": 0.75, "model": ["4", 0], "positive": ["5", 0], "negative": ["6", 0], "latent_image": ["2", 0]}},
      "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"}},
      "5": {"class_type": "CLIPTextEncode", "inputs": {"text": "Pablo Picasso cubist painting, abstract cubism portrait, fragmented face with geometric planes, multiple perspectives, bold angular lines, vivid primary colors blue red yellow, distorted proportions, analytical cubism, overlapping facets, thick impasto brushstrokes, oil on canvas masterpiece, modern art museum quality", "clip": ["4", 1]}},
      "6": {"class_type": "CLIPTextEncode", "inputs": {"text": "photograph, realistic, photo, smooth, natural, normal proportions, 3d render, watermark, text, blurry", "clip": ["4", 1]}},
      "7": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
      "8": {"class_type": "SaveImage", "inputs": {"filename_prefix": "picasso_test", "images": ["7", 0]}}
    }
  }'
```

### 4c. Van Gogh Style

```bash
curl -s -X POST http://127.0.0.1:8188/prompt \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": {
      "1": {"class_type": "LoadImage", "inputs": {"image": "source.png"}},
      "2": {"class_type": "VAEEncode", "inputs": {"pixels": ["1", 0], "vae": ["4", 2]}},
      "3": {"class_type": "KSampler", "inputs": {"seed": 147, "steps": 30, "cfg": 8.5, "sampler_name": "euler_ancestral", "scheduler": "karras", "denoise": 0.75, "model": ["4", 0], "positive": ["5", 0], "negative": ["6", 0], "latent_image": ["2", 0]}},
      "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"}},
      "5": {"class_type": "CLIPTextEncode", "inputs": {"text": "Vincent van Gogh painting style, impressionist portrait, swirling thick brushstrokes, vibrant bold colors, starry night swirl patterns, post-impressionism, bold impasto texture, dynamic movement in brushwork, vivid yellows blues and oranges, expressive emotional color palette, oil on canvas masterpiece, Van Gogh signature style", "clip": ["4", 1]}},
      "6": {"class_type": "CLIPTextEncode", "inputs": {"text": "photograph, realistic, photo, smooth, natural, normal proportions, 3d render, watermark, text, blurry", "clip": ["4", 1]}},
      "7": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
      "8": {"class_type": "SaveImage", "inputs": {"filename_prefix": "vangogh_test", "images": ["7", 0]}}
    }
  }'
```

**Display in chat (markdown):**
```markdown
![Generated Image](http://YOUR_IP:PORT/ComfyUI/output/picasso_test_00001_.png)
```

---

## 5. Check Generation Status

```bash
# Replace PROMPT_ID with the ID from the curl response
curl -s http://127.0.0.1:8188/history/PROMPT_ID | python3 -m json.tool
```

**Or poll for completion:**
```bash
for i in $(seq 1 60); do
  STATUS=$(curl -s http://127.0.0.1:8188/history/PROMPT_ID 2>/dev/null)
  if echo "$STATUS" | python3 -c "import json,sys; d=json.load(sys.stdin); print('YES' if d.get('outputs') else 'NO')" 2>/dev/null | grep -q YES; then
    echo "Generation complete!"
    ls -lt ~/ComfyUI/output/*_00001_.png | head -1
    break
  fi
  echo "Waiting... ($i)"
  sleep 2
done
```

---

## 6. View Output Images in Chat

### Option A: HTTP Server (Quick)

```bash
# Start a simple HTTP server in the output directory
cd ~/ComfyUI/output && python3 -m http.server 8888 --bind 0.0.0.0

# Then reference images in chat:
# ![Image](http://YOUR_IP:8888/filename.png)
```

### Option B: Copy to Workspace

```bash
cp ~/ComfyUI/output/picasso_test_00001_.png ~/rocclaw/public/test-output.png

# Then in chat:
# ![Image](/test-output.png)
```

### Option C: Base64 Inline (Small Images)

```bash
# Convert to base64 for inline display
base64 ~/ComfyUI/output/picasso_test_00001_.png | head -c 100
echo "..."
```

---

## 7. Display via OpenClaw Message Tool

If sending to a channel (Discord, Slack, etc.):

```bash
# The image must be accessible via HTTP(S)
# Use python -m http.server or serve from the rocclaw public directory
```

In OpenClaw chat, reference with:
```markdown
![Generated Image](http://10.0.0.60:8888/picasso_test_00001_.png)
```

Or use the `message` tool with `media` parameter pointing to a URL.

---

## Troubleshooting Tests

| Test | Command | Expected |
|------|---------|----------|
| Server up | `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8188/` | `200` |
| GPU detected | `rocminfo \| grep -i "Radeon\|gfx"` | Shows device name |
| PyTorch GPU | `python3 -c "import torch; print(torch.cuda.is_available())"` | `True` |
| Model exists | `ls ~/ComfyUI/models/checkpoints/*.safetensors` | Shows file |
| VRAM | `rocm-smi --showmeminfo vram` | Shows memory |

---

_Last updated: 2026-05-14_
