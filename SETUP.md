# Image Generation & Photo Booth Setup Guide

A comprehensive guide for setting up the Image Generation and Photo Booth features in a new environment.

---

## Prerequisites

- **OS**: Linux (Ubuntu 20.04+ recommended) or macOS
- **Python**: 3.10+
- **Node.js**: 18+ (for the Next.js app)
- **GPU**: NVIDIA GPU with CUDA support (recommended) or CPU mode
- **Storage**: ~10GB free space (for models)
- **Memory**: 16GB+ RAM recommended

---

## Step 1: Install ComfyUI

ComfyUI is the backend engine for image generation.

```bash
# Clone ComfyUI
cd ~
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI

# Install dependencies
pip install -r requirements.txt

# For NVIDIA GPU support (recommended)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# For CPU-only mode (slower)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

---

## Step 2: Download Required Models

The app requires Stable Diffusion XL (SDXL) base model.

```bash
# Create models directory if it doesn't exist
mkdir -p ~/ComfyUI/models/checkpoints

# Download SDXL Base 1.0 (~6.9GB)
cd ~/ComfyUI/models/checkpoints
wget https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors

# Alternative: Download manually from Hugging Face
# https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0
```

**Verify the download:**
```bash
ls -lh ~/ComfyUI/models/checkpoints/sd_xl_base_1.0.safetensors
# Should show ~6.9GB file
```

---

## Step 3: Configure Environment

Set the ComfyUI API URL (optional - uses default if not set):

```bash
# Add to ~/.bashrc or ~/.zshrc
export COMFYUI_API_URL="http://127.0.0.1:8188"

# Apply changes
source ~/.bashrc  # or source ~/.zshrc
```

---

## Step 4: Configure Port (Agent Setup)

This app uses **port 8188** by default for ComfyUI. If you need to use a different port, update both the environment and startup command:

```bash
# Example: Use port 8189 instead
export COMFYUI_API_URL="http://127.0.0.1:8189"
echo 'export COMFYUI_API_URL="http://127.0.0.1:8189"' >> ~/.bashrc
```

**Important:** The `COMFYUI_API_URL` environment variable controls:
- Where the app checks for ComfyUI status
- Where the Start/Stop buttons connect
- Where API requests are sent

**Agent Quick Setup (port 8188):**
```bash
# Set once
export COMFYUI_API_URL="http://127.0.0.1:8188"

# Then start ComfyUI on the same port
python ~/ComfyUI/main.py --listen 127.0.0.1 --port 8188
```

---

## Step 5: Start ComfyUI

```bash
cd ~/ComfyUI

# Start with GPU (default port 8188)
python main.py --listen 127.0.0.1 --port 8188

# Or with custom port (must match COMFYUI_API_URL)
# python main.py --listen 127.0.0.1 --port 8189

# Start with CPU only (add --cpu flag)
# python main.py --cpu --listen 127.0.0.1 --port 8188
```

**Verify ComfyUI is running:**
- Open http://127.0.0.1:8188 in browser
- You should see the ComfyUI interface

---

## Step 5: Start the Next.js App

```bash
cd /path/to/rocclaw

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

The app will be available at http://localhost:3000

---

## Feature-Specific Setup

### Image Generation Tab
- ✅ Works once ComfyUI + SDXL model is loaded
- Uses public domain character templates
- No additional setup required

### Photo Booth Tab
- ✅ Requires browser camera permissions
- Uses webcam for photo capture
- Transforms photos through 9 art styles
- **Browser permissions**: Allow camera access when prompted

---

## Troubleshooting

### "ComfyUI is offline" Error
```bash
# Check if ComfyUI is running
curl http://127.0.0.1:8188/system_stats

# If no response, restart ComfyUI:
cd ~/ComfyUI && python main.py --listen 0.0.0.0 --port 8188
```

### "No valid characters specified" Error
- Frontend and backend character lists are mismatched
- Ensure both `ImageGenDashboard.tsx` and `imageGenerationWorkflow.ts` have the same characters

### Model Loading Errors
```bash
# Check model exists
ls -lh ~/ComfyUI/models/checkpoints/

# Verify file size is ~6.9GB
# If corrupted, re-download the model
```

### CUDA Out of Memory
```bash
# Use CPU mode instead
cd ~/ComfyUI
python main.py --cpu --listen 0.0.0.0 --port 8188
```

### Camera Not Working (Photo Booth)
- Ensure HTTPS or localhost (browsers block camera on insecure origins)
- Check browser permissions: Chrome Settings > Privacy > Camera
- Try refreshing the page and allowing camera access

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/image-generation-demo` | Get status, characters, locations |
| `POST /api/image-generation-demo` | Generate character images |
| `PUT /api/image-generation-demo` | Start ComfyUI |
| `GET /api/photobooth` | Check ComfyUI status |
| `POST /api/photobooth` | Upload image & queue style generation |
| `GET /api/photobooth/status` | Check generation status |
| `POST /api/photobooth/stop` | Stop ComfyUI server |

---

## File Structure

```
rocclaw/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── image-generation-demo/
│   │   │   │   └── route.ts          # Image Gen API
│   │   │   └── photobooth/
│   │   │       ├── route.ts           # Photo Booth upload API
│   │   │       ├── status/
│   │   │       │   └── route.ts       # Job status API
│   │   │       └── stop/
│   │   │           └── route.ts       # Stop ComfyUI API
│   │   └── page.tsx                   # Main app page
│   ├── components/
│   │   ├── ImageGenDashboard.tsx      # Image Gen UI
│   │   └── PhotoBoothDashboard.tsx     # Photo Booth UI
│   └── features/
│       └── image-generation/
│           └── operations/
│               └── imageGenerationWorkflow.ts  # Backend workflow
├── SETUP.md                           # This file
└── README.md                          # General project info
```

---

## Quick Verification Commands

```bash
# 1. Check ComfyUI is running
curl http://127.0.0.1:8188/system_stats | jq

# 2. Check model exists
ls ~/ComfyUI/models/checkpoints/*.safetensors

# 3. Check app is running
curl http://localhost:3000/api/image-generation-demo | jq

# 4. Verify all services
# ComfyUI: http://127.0.0.1:8188
# App:      http://localhost:3000
```

---

## Automated Setup Script

Create `setup.sh`:

```bash
#!/bin/bash
set -e

echo "=== Setting up Image Generation & Photo Booth ==="

# Install ComfyUI if not exists
if [ ! -d "$HOME/ComfyUI" ]; then
    echo "Installing ComfyUI..."
    cd ~
    git clone https://github.com/comfyanonymous/ComfyUI.git
    cd ComfyUI
    pip install -r requirements.txt
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
fi

# Download model if not exists
if [ ! -f "$HOME/ComfyUI/models/checkpoints/sd_xl_base_1.0.safetensors" ]; then
    echo "Downloading SDXL model..."
    mkdir -p ~/ComfyUI/models/checkpoints
    cd ~/ComfyUI/models/checkpoints
    wget https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors
fi

echo "=== Setup Complete ==="
echo "Start ComfyUI: cd ~/ComfyUI && python main.py --listen 0.0.0.0 --port 8188"
echo "Start App:      npm run dev"
```

Make executable: `chmod +x setup.sh`

---

## Notes

- **GPU**: First generation may take longer (model loading)
- **Storage**: Generated images saved in `ComfyUI/output/`
- **Gallery**: Persisted in browser localStorage
- **Security**: Photo Booth requires HTTPS or localhost for camera access

---

_Last updated: 2026-05-10_
