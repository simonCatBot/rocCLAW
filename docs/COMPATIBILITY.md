# Compatibility

## Supported Platforms

| Platform | Status | Notes |
|----------|--------|-------|
| **Ubuntu 24.04 LTS** | ✅ Fully tested | Primary development platform |
| **Ubuntu 22.04 LTS** | ✅ Fully tested | |
| **Linux (other distros)** | ✅ Expected to work | Kernel 6.x+ recommended |
| **macOS** | ✅ Expected to work | GPU monitoring not available |
| **Windows (WSL2)** | ✅ Expected to work | GPU monitoring not available |

## GPU Monitoring (optional)

GPU metrics are optional — rocCLAW works without them. When available, live utilization, VRAM, temperature, power, and clock data appear in the System and Graph tabs.

| GPU | Detection |
|-----|-----------|
| **Ryzen AI MAX+ 395** | ROCm |
| **Ryzen AI 300 series** | ROCm |
| **Radeon RX 7900 XTX** | ROCm |
| **Other AMD GPUs** | ROCm or sysfs fallback |

ROCm is checked first (`rocminfo` + `rocm-smi`). If unavailable, rocCLAW falls back to `lspci` + DRM sysfs for basic GPU info — no ROCm install required.
