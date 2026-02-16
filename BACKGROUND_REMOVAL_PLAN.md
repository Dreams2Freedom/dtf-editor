# In-House Background Removal Tool - Implementation Plan

**Date:** February 15, 2026
**Goal:** Replace ClippingMagic with an in-house background removal tool powered by Meta's SAM2 (Segment Anything Model 2)
**Current Cost:** $0.125 per image via ClippingMagic API
**Target Cost:** $0 per image (self-hosted model)

---

## Architecture Overview

### The Approach: Hybrid Client-Server SAM2

Based on proven implementations (Labelbox, Geronimo's Vercel demo), the optimal architecture is:

```
┌─────────────────────────────────────────────────────┐
│  BROWSER (Client-Side)                              │
│                                                     │
│  ┌─────────────┐    ┌───────────────────────────┐   │
│  │ Canvas       │    │ SAM2 Decoder (ONNX)       │   │
│  │ Editor UI    │───▶│ ~15MB, runs via WebGPU    │   │
│  │ (React)      │    │ Real-time mask generation  │   │
│  └─────────────┘    └───────────────────────────┘   │
│        │                        ▲                    │
│        │ User clicks            │ Image embeddings   │
│        ▼                        │                    │
└────────┼────────────────────────┼────────────────────┘
         │ Upload image           │ Return embeddings
         ▼                        │
┌────────────────────────────────┐│
│  SERVER (API Route or Edge)    ││
│                                ││
│  ┌───────────────────────────┐ ││
│  │ SAM2 Encoder              │─┘│
│  │ Runs on server w/ GPU     │  │
│  │ or Replicate/Modal API    │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Post-Processing           │  │
│  │ - Apply mask to image     │  │
│  │ - Trim transparent pixels │  │
│  │ - Export PNG @ 300 DPI    │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

**Why hybrid?**
- The SAM2 **encoder** is heavy (~100MB+ model, needs GPU) → runs on server
- The SAM2 **decoder** is light (~15MB ONNX) → runs in browser via WebGPU/WASM
- This gives **real-time interactive feedback** when user clicks/marks (decoder runs instantly in browser)
- Only one server round-trip needed (for the encoder), then all interaction is instant

---

## What We're Building (Feature Parity with ClippingMagic)

### Core Features

| Feature | ClippingMagic | Our Implementation |
|---------|--------------|-------------------|
| Auto-detect subject | Yes (AI) | SAM2 auto-segmentation |
| Green mark (keep) | Yes | Positive point prompts → SAM2 |
| Red mark (remove) | Yes | Negative point prompts → SAM2 |
| Real-time preview | Yes (in popup) | Yes (inline canvas, no popup needed!) |
| Transparent background | Yes (PNG) | Yes (PNG with alpha channel) |
| Trim to content | Yes (fit-to-result) | Yes (auto-crop transparent pixels) |
| Edge refinement | Yes (feathering, smoothing) | Configurable feather + matting |
| Hair/fur detection | Yes (auto-detect) | SAM2 handles well, plus alpha matting |
| 300 DPI output | Yes | Yes (preserve original resolution) |
| Undo/redo | Limited | Full undo/redo stack |

### UX Improvements Over ClippingMagic

1. **No popup window** - Editor is inline on the page (no popup blockers!)
2. **Faster interaction** - Decoder runs locally, no round-trip per click
3. **No external dependency** - No API keys, no per-image cost
4. **Better mobile support** - Touch-friendly canvas instead of popup
5. **Instant auto-detection** - SAM2 auto-segments on upload

---

## Technical Implementation Plan

### Phase 1: Backend - SAM2 Encoder Service (Week 1)

**Goal:** Server endpoint that accepts an image and returns SAM2 embeddings

#### Option A: Self-Hosted (Recommended for cost savings)
- Deploy SAM2 encoder as a Python service using:
  - **Modal** (serverless GPU, pay-per-use, ~$0.001/image)
  - **Replicate** (hosted SAM2 endpoint already available)
  - **Railway/Fly.io** with GPU (persistent, ~$50-100/mo)

#### Option B: Replicate API (Fastest to ship)
- Use existing SAM2 endpoint on Replicate
- ~$0.005/image (still 25x cheaper than ClippingMagic)
- Can migrate to self-hosted later

#### API Route: `/api/segment/encode`
```typescript
// POST /api/segment/encode
// Input: image file (multipart/form-data)
// Output: { embeddings: Float32Array, imageSize: { width, height } }

export async function POST(request: NextRequest) {
  // 1. Authenticate user
  // 2. Check credits (or make free since no per-image cost)
  // 3. Resize image to 1024x1024 for SAM2 input
  // 4. Send to SAM2 encoder (Modal/Replicate/self-hosted)
  // 5. Return embeddings + original image dimensions
}
```

#### Model Details
- **Model:** `sam2.1-hiera-tiny` (smallest, fastest, good enough for background removal)
- **Encoder output:** Image embeddings (~256KB compressed)
- **Latency target:** <2 seconds for encoding

### Phase 2: Frontend - Interactive Editor Canvas (Week 1-2)

**Goal:** React canvas component that replaces the ClippingMagic popup

#### Component: `<BackgroundRemovalEditor />`

```
┌──────────────────────────────────────────────────┐
│  [Toolbar]                                        │
│  🟢 Keep  🔴 Remove  ✏️ Brush Size  ↩️ Undo      │
│                                                   │
│  ┌─────────────────┐  ┌────────────────────────┐  │
│  │                  │  │                         │  │
│  │  Original Image  │  │  Preview (with mask)    │  │
│  │  + User marks    │  │  Checkerboard bg        │  │
│  │                  │  │                         │  │
│  └─────────────────┘  └────────────────────────┘  │
│                                                   │
│  [Edge Refinement: Feather ○───────● Smooth]      │
│                                                   │
│  [ Cancel ]              [ Apply & Download ]     │
└──────────────────────────────────────────────────┘
```

#### Key Interactions
1. **Upload** → Image sent to server encoder → embeddings returned
2. **Auto-segment** → SAM2 decoder runs in browser with auto-detect
3. **User clicks green (keep)** → Positive point → decoder re-runs mask instantly
4. **User clicks red (remove)** → Negative point → decoder re-runs mask instantly
5. **Brush mode** → User paints region → converted to point prompts
6. **Preview updates in real-time** → Masked image shown on right pane
7. **Apply** → Final mask applied server-side at full resolution

#### Technology Stack
- **Canvas rendering:** HTML5 Canvas or PixiJS for performance
- **ONNX Runtime:** `onnxruntime-web` with WebGPU backend
- **SAM2 Decoder:** `sam2_hiera_tiny_decoder.onnx` (~15MB, cached in browser)
- **Web Worker:** Decoder runs in Web Worker (non-blocking UI)

### Phase 3: Decoder - Browser-Side ONNX Inference (Week 2)

**Goal:** SAM2 decoder running in browser for real-time mask generation

#### Implementation
```typescript
// src/lib/sam2/decoder.ts
import * as ort from 'onnxruntime-web';

class SAM2Decoder {
  private session: ort.InferenceSession | null = null;

  async initialize() {
    // Load decoder ONNX model (cached after first load)
    this.session = await ort.InferenceSession.create(
      '/models/sam2_hiera_tiny_decoder.onnx',
      { executionProviders: ['webgpu', 'wasm'] } // Fallback to WASM
    );
  }

  async predict(
    imageEmbeddings: Float32Array,  // From server encoder
    points: { x: number; y: number; label: 'keep' | 'remove' }[],
    imageSize: { width: number; height: number }
  ): Promise<ImageData> {
    // Convert points to SAM2 input format
    // Run decoder inference (~50ms on WebGPU)
    // Return mask as ImageData
  }
}
```

#### Point Prompt System
- **Green click (keep):** `label = 1` (foreground)
- **Red click (remove):** `label = 0` (background)
- **Brush stroke:** Converted to multiple points along the stroke path
- **Box select:** Converted to SAM2 box prompt `[x1, y1, x2, y2]`

### Phase 4: Post-Processing Pipeline (Week 2-3)

**Goal:** Convert mask to final transparent PNG with trim

#### Server endpoint: `/api/segment/apply-mask`
```typescript
// POST /api/segment/apply-mask
// Input: { imageId, mask (binary), options }
// Output: Processed PNG image

// Steps:
// 1. Load original full-resolution image from storage
// 2. Apply mask at full resolution (upscale mask if needed)
// 3. Optional: Apply edge feathering/smoothing
// 4. Optional: Alpha matting for hair/fur edges
// 5. Remove background (set alpha = 0)
// 6. Trim transparent pixels (auto-crop)
// 7. Save as PNG at 300 DPI
// 8. Upload to Supabase storage
// 9. Return download URL
```

#### Image Processing Tools (Server-Side)
- **Sharp** (already in project) - Resize, crop, format conversion
- **Alpha matting** - For hair/fur edge refinement (can use simple feathering or a lightweight matting model)
- **Auto-crop** - Trim all fully-transparent border pixels

### Phase 5: Integration & Migration (Week 3)

**Goal:** Wire it all together, replace ClippingMagic in the UI

#### Migration Strategy (Non-Breaking)
1. Build new editor at `/process/background-removal-v2` (separate route)
2. Test thoroughly with real images
3. Add feature flag: `USE_SAM2_EDITOR=true` in env
4. Swap the route - old ClippingMagic flow → new SAM2 flow
5. Keep ClippingMagic code for 2 weeks as fallback
6. Remove ClippingMagic integration entirely

#### Files to Create
```
src/lib/sam2/
  decoder.ts          - Browser-side SAM2 decoder wrapper
  decoder.worker.ts   - Web Worker for non-blocking inference
  types.ts            - TypeScript types for SAM2 I/O
  utils.ts            - Image preprocessing, mask post-processing

src/components/editor/
  BackgroundRemovalEditor.tsx   - Main editor component
  EditorCanvas.tsx              - Canvas with pan/zoom/draw
  EditorToolbar.tsx             - Tool selection, brush size
  MaskPreview.tsx               - Real-time preview pane
  EdgeRefinementControls.tsx    - Feather, smooth, matting options

src/app/api/segment/
  encode/route.ts     - Server-side SAM2 encoder
  apply-mask/route.ts - Full-resolution mask application + trim

public/models/
  sam2_hiera_tiny_decoder.onnx  - Decoder model (~15MB)
```

#### Files to Modify
```
src/app/process/background-removal/client.tsx  - Replace CM with new editor
src/services/costTracking.ts                   - Update cost ($0 per image)
src/config/env.ts                              - Add SAM2 config vars
```

#### Files to Eventually Remove
```
src/services/clippingMagic.ts
src/components/image/ClippingMagicEditor.tsx
src/app/api/clippingmagic/upload/route.ts
src/app/api/clippingmagic/upload-large/route.ts
src/app/api/clippingmagic/download/[id]/route.ts
```

---

## Development Timeline

| Week | Phase | Deliverable |
|------|-------|-------------|
| Week 1 | Phase 1 + 2 | SAM2 encoder API + basic canvas editor with dual-pane view |
| Week 2 | Phase 3 + 4 | Browser decoder with real-time masks + post-processing pipeline |
| Week 3 | Phase 5 | Full integration, testing, feature flag rollout |
| Week 4 | Polish | Edge cases, mobile optimization, ClippingMagic removal |

---

## Cost Comparison

| | ClippingMagic | SAM2 Self-Hosted | SAM2 via Replicate |
|-|--------------|-----------------|-------------------|
| Per image | $0.125 | ~$0.001 (GPU compute) | ~$0.005 |
| 1,000 images/mo | $125 | ~$1 | ~$5 |
| 10,000 images/mo | $1,250 | ~$10 | ~$50 |
| 100,000 images/mo | $12,500 | ~$100 | ~$500 |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| SAM2 quality not as good as ClippingMagic for certain images | Users get worse results | Alpha matting post-processing for hair/edges; keep ClippingMagic as premium fallback |
| WebGPU not supported in older browsers | ~15% of users can't use interactive editor | WASM fallback (slower but works everywhere) |
| Encoder latency on cold start | 5-10s first request | Keep-alive on Modal/Replicate; show progress indicator |
| ONNX model size (15MB decoder) | Slow first load | Cache in browser OPFS; show download progress; preload on page navigation |
| Complex hair/fur edges | Less clean than ClippingMagic's specialized algorithm | Add alpha matting post-processing step; iterate on quality |

---

## Open Decisions

1. **Encoder hosting:** Modal vs Replicate vs self-hosted? (Recommend: Start with Replicate for speed, migrate to Modal for cost)
2. **Credit system:** Keep 1 credit per removal, or make it free since no API cost? (Recommend: Keep credits but reduce cost to 0.5 credits)
3. **Model size:** `sam2_hiera_tiny` (fastest, good quality) vs `sam2_hiera_small` (better quality, slower)? (Recommend: Start with tiny, offer small as "HD" option)
4. **Alpha matting:** Include in v1 or add later? (Recommend: Basic feathering in v1, full matting in v2)

---

## References

- [Meta SAM2 Official Repo](https://github.com/facebookresearch/sam2)
- [SAM2 in Browser via ONNX (Labelbox)](https://labelbox.com/blog/bringing-ai-to-the-browser-sam2-for-interactive-image-segmentation/)
- [In-Browser SAM2 with WebGPU (Geronimo)](https://medium.com/@geronimo7/in-browser-image-segmentation-with-segment-anything-model-2-c72680170d92)
- [WebGPU SAM2 Implementation](https://github.com/lucasgelfond/webgpu-sam2)
- [SAM2 ONNX Export](https://github.com/admineral/SAM2-ONNX)
- [SAM Remove Background App](https://github.com/MrSyee/SAM-remove-background)
