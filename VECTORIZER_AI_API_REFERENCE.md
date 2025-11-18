# Vectorizer.AI API - Complete Reference Guide

**Last Updated:** November 17, 2025
**Official Docs:** https://vectorizer.ai/api
**Base URL:** `https://api.vectorizer.ai/api/v1/`

---

## 🔐 AUTHENTICATION

**Method:** HTTP Basic Authentication over HTTPS
**Format:** `username:password` = `API_ID:API_SECRET`

**Requirements:**

- HTTPS only (TLS/SSL required)
- Client must support Server Name Indication (SNI)
- API ID and Secret from https://vectorizer.ai/account

**Example:**

```bash
curl -u xyz123:your_secret_key https://vectorizer.ai/api/v1/vectorize
```

---

## 📍 ENDPOINTS

### 1. `/vectorize` (POST) - Convert Image to Vector

**Purpose:** Main endpoint for bitmap-to-vector conversion

**Input Methods (choose one):**

1. **File Upload** (Recommended)

   ```bash
   -F image=@example.jpeg
   ```

2. **Base64 String** (Max 1MB)

   ```bash
   -F image.base64="iVBORw0KGgo..."
   ```

3. **URL Fetch**

   ```bash
   -F image.url="https://example.com/image.jpg"
   ```

4. **Image Token** (from previous call)
   ```bash
   -F image.token="abc123..."
   ```

**Supported Input Formats:**

- `.bmp`, `.gif`, `.jpeg`, `.png`, `.tiff`
- Max 33.5 million pixels
- Default max: 2,097,252 pixels

---

### 🎯 KEY PARAMETERS

#### **Processing Mode** (CRITICAL!)

| Mode           | Cost        | Description                   | Use Case            |
| -------------- | ----------- | ----------------------------- | ------------------- |
| `test`         | FREE        | Full result with watermark    | Development/testing |
| `test_preview` | FREE        | 4x PNG preview with watermark | Quick testing       |
| `preview`      | 0.2 credits | 4x PNG preview, no watermark  | Before production   |
| `production`   | 1.0 credit  | Full production output        | Final result        |

```bash
-F mode=production
```

⚠️ **IMPORTANT:** Always use `mode=production` for paid users! Preview modes add watermarks.

---

#### **Output Format** (CRITICAL!)

```bash
-F output.file_format=svg     # Scalable Vector Graphics (default)
-F output.file_format=pdf     # PDF document
-F output.file_format=eps     # Encapsulated PostScript
-F output.file_format=dxf     # AutoCAD Drawing Exchange
-F output.file_format=png     # Raster (for testing)
```

**For PDF Output:**

- No special parameters required
- PDF will contain vector paths (not raster image)
- Uses same processing as SVG
- Single-page output

---

#### **Color Processing**

```bash
# Limit color palette
-F processing.max_colors=16

# Custom color mapping with tolerance
-F 'processing.palette[0].color=#FF0000'
-F 'processing.palette[0].tolerance=10'
-F 'processing.palette[1].color=#00FF00'
-F 'processing.palette[1].tolerance=10'
```

**Color Tolerance:**

- Range: 0-100
- Higher = more colors grouped together
- Lower = more precise color matching

---

#### **Shape Processing**

```bash
# Minimum shape size (pixels)
-F processing.shapes.min_area_px=5.0

# Valid range: 0.0 to 100.0
# Use to filter out noise/dust
```

---

#### **Output Styling** (IMPORTANT!)

```bash
# Drawing style
-F output.draw_style=fill_shapes      # Filled paths (DEFAULT - RECOMMENDED)
-F output.draw_style=stroke_shapes    # Outlined shapes
-F output.draw_style=stroke_edges     # Edge detection style

# Shape stacking
-F output.shape_stacking=cutouts      # Shapes cut out overlapping areas
-F output.shape_stacking=stacked      # Shapes stack on top (DEFAULT)

# Grouping
-F output.group_by=color              # Group by color (RECOMMENDED)
-F output.group_by=layer              # Group by layer
-F output.group_by=parent             # Group by parent shape
-F output.group_by=none               # No grouping
```

**🚨 CRITICAL FOR PDF:**

- Use `output.draw_style=fill_shapes` (default)
- Use `output.shape_stacking=stacked` (default)
- These ensure proper rendering in PDF viewers

---

#### **Output Sizing**

```bash
# Scale factor
-F output.size.scale=2.0              # 2x original size

# Fixed dimensions
-F output.size.width=1000
-F output.size.height=1000
-F output.size.unit=px                # px, pt, in, cm, mm, none

# Aspect ratio handling
-F output.size.aspect_ratio=preserve_inset    # Letterbox (default)
-F output.size.aspect_ratio=preserve_overflow # Crop to fill
-F output.size.aspect_ratio=stretch          # Stretch to fit

# DPI settings
-F output.size.input_dpi=72
-F output.size.output_dpi=300         # High quality for print
```

---

#### **Curve Control**

```bash
# Allowed curve types (all enabled by default)
-F output.curves.allowed_quadratic_bezier=true
-F output.curves.allowed_cubic_bezier=true
-F output.curves.allowed_circular_arc=true
-F output.curves.allowed_elliptical_arc=true

# Line fitting tolerance (0.001 to 1.0)
-F output.curves.line_fit_tolerance=0.1  # Lower = more accurate
```

---

#### **Gap Filler** (Fixes Rendering Issues)

```bash
-F output.gap_filler.enabled=true
-F output.gap_filler.stroke_width=0.5    # 0.0 to 5.0
-F output.gap_filler.clip=true
-F output.gap_filler.non_scaling_stroke=true
```

**Use when:**

- PDF shows gaps/white lines between shapes
- Anti-aliasing causes visual artifacts
- Viewer shows seams between adjacent paths

---

#### **SVG-Specific Options**

```bash
-F output.svg.version=svg_1_1                    # svg_1_0, svg_1_1, svg_tiny_1_2
-F output.svg.fixed_size=true                    # Fixed vs flexible dimensions
-F output.svg.adobe_compatibility_mode=true     # Better Illustrator compatibility
```

---

#### **PDF-Specific Options**

**None!** PDF uses same parameters as SVG. Key settings:

- `mode=production` (required for clean output)
- `output.file_format=pdf`
- `output.draw_style=fill_shapes` (default, recommended)
- Optional: `output.gap_filler.enabled=true` (if gaps appear)

---

#### **DXF-Specific Options**

```bash
-F output.dxf.compatibility_level=lines_and_arcs
# Options: lines_only, lines_and_arcs, lines_arcs_and_splines
```

---

#### **Storage/Retention**

```bash
-F policy.retention_days=7    # 0-30 days
# Cost: 0.01 credits per day after first free day
# 0 = delete immediately after response
```

---

### 📥 RESPONSE HEADERS (IMPORTANT!)

```
X-Image-Token: abc123...          # Reuse for download/delete
X-Credits-Calculated: 1.0         # What would be charged (test mode)
X-Credits-Charged: 1.0            # Actual charge (production)
Content-Type: image/svg+xml       # or application/pdf, etc.
```

---

### 2. `/download` (POST) - Get Additional Formats

**Purpose:** Download same image in different format without re-processing

**Parameters:**

```bash
-F image.token=abc123...          # REQUIRED (from vectorize response)
-F receipt=xyz789...              # Optional (from prior download)
-F output.file_format=pdf         # Desired format
# Plus any output styling parameters
```

**Cost:**

- 0.1 credits per format (90% discount!)
- Use receipt for multiple formats at same discount

**Example Workflow:**

1. Vectorize as SVG (1.0 credit) → get token
2. Download as PDF (0.1 credit) using token → get receipt
3. Download as EPS (0.1 credit) using receipt
4. Download as DXF (0.1 credit) using receipt

---

### 3. `/delete` (POST) - Remove Stored Image

```bash
curl https://vectorizer.ai/api/v1/delete \
  -u xyz123:secret \
  -F image.token=abc123...
```

**Response:** `{"success": true}`

**Use when:** Want to free storage before expiration

---

### 4. `/account` (GET) - Check Credits

```bash
curl https://vectorizer.ai/api/v1/account \
  -u xyz123:secret
```

**Response:**

```json
{
  "subscriptionPlan": "Professional",
  "subscriptionState": "active",
  "credits": 42.5
}
```

---

## 💰 PRICING SUMMARY

| Operation             | Credits  | Notes                                       |
| --------------------- | -------- | ------------------------------------------- |
| Test Mode             | FREE     | Has watermark                               |
| Preview               | 0.2      | 4x PNG preview                              |
| Production            | 1.0      | Full vector output                          |
| Preview → Production  | 0.9      | Upgrade with token (1.0 - 0.2 already paid) |
| Additional Format     | 0.1      | With token/receipt                          |
| Storage (after day 1) | 0.01/day | Up to 30 days max                           |

---

## 🔧 COMPLETE WORKING EXAMPLE

### Production PDF with Proper Settings

```bash
curl https://vectorizer.ai/api/v1/vectorize \
  -u xyz123:your_secret_key \
  -F image=@input.jpg \
  -F mode=production \
  -F output.file_format=pdf \
  -F output.draw_style=fill_shapes \
  -F output.shape_stacking=stacked \
  -F output.group_by=color \
  -F processing.max_colors=256 \
  -F output.gap_filler.enabled=true \
  -F output.gap_filler.stroke_width=0.5 \
  -F output.size.output_dpi=300 \
  -o result.pdf
```

### Node.js Example

```javascript
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function vectorize(imagePath, outputPath) {
  const form = new FormData();

  form.append('image', fs.createReadStream(imagePath));
  form.append('mode', 'production');
  form.append('output.file_format', 'pdf');
  form.append('output.draw_style', 'fill_shapes');
  form.append('output.shape_stacking', 'stacked');
  form.append('output.group_by', 'color');
  form.append('output.gap_filler.enabled', 'true');
  form.append('output.gap_filler.stroke_width', '0.5');

  const response = await fetch('https://vectorizer.ai/api/v1/vectorize', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from('xyz123:secret').toString('base64'),
    },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const buffer = await response.buffer();
  fs.writeFileSync(outputPath, buffer);

  return {
    token: response.headers.get('x-image-token'),
    credits: response.headers.get('x-credits-charged'),
  };
}
```

---

## 🚨 COMMON ISSUES & FIXES

### Issue: PDF Shows Solid Color / Missing Details

**Causes:**

1. ❌ Using `mode=preview` or `mode=test` (adds watermark)
2. ❌ Wrong `output.draw_style` setting
3. ❌ Too few colors (`processing.max_colors` too low)
4. ❌ Input image too small/low resolution

**Solutions:**

1. ✅ Use `mode=production`
2. ✅ Use `output.draw_style=fill_shapes` (default)
3. ✅ Remove or increase `processing.max_colors`
4. ✅ Ensure input is high quality
5. ✅ Enable gap filler if needed

### Issue: PDF Has White Lines/Gaps

**Solution:**

```bash
-F output.gap_filler.enabled=true
-F output.gap_filler.stroke_width=0.5
```

### Issue: PDF Colors Don't Match Original

**Solutions:**

1. Remove `processing.palette` (let auto-detect)
2. Increase `processing.max_colors` (default 256)
3. Check input image color mode (RGB vs CMYK)

### Issue: PDF File Size Too Large

**Solutions:**

1. Reduce `processing.max_colors`
2. Increase `processing.shapes.min_area_px` (remove tiny shapes)
3. Reduce `output.size.output_dpi` if over 300

---

## ⚡ PERFORMANCE & RATE LIMITS

**Recommended Threading:**

- Start: 5 concurrent threads
- Ramp: Add 1 thread every 5 minutes
- Max: Contact before using >100 threads

**On 429 (Too Many Requests):**

- Apply linear backoff: 5s, 10s, 15s, 20s...
- Don't use exponential backoff
- Retry after backoff period

**Timeouts:**

- Minimum idle timeout: 180 seconds
- Processing can take 30-60s for complex images
- Don't set timeout below 3 minutes

---

## 🔍 ERROR HANDLING

**Response Format:**

```json
{
  "status": 400,
  "code": "InvalidParameter",
  "message": "The parameter 'output.file_format' must be one of: svg, eps, pdf, dxf, png"
}
```

**HTTP Status Codes:**

- `200-299`: Success
- `400`: Bad request - fix parameters
- `401`: Authentication failed
- `402`: Insufficient credits
- `429`: Rate limited - back off
- `500-599`: Server error - retry with backoff

---

## 📚 ADDITIONAL RESOURCES

- **Official Docs:** https://vectorizer.ai/api
- **Account Management:** https://vectorizer.ai/account
- **AI Chatbot:** Custom GPT for integration help
- **Support:** support@vectorizer.ai

---

## 🔄 CHANGELOG

- **Nov 2024:** Added `processing.shapes.min_area_px`
- **Sep 2024:** Introduced Image Tokens, Receipts, Download/Delete
- **Jun 2024:** Added `processing.palette` parameter
- **Aug 2023:** Full sizing options and bitmap anti-aliasing

---

## ✅ CRITICAL CHECKLIST FOR DTF EDITOR

When implementing vectorization:

- [ ] Use `mode=production` (not test/preview)
- [ ] Set `output.file_format=pdf` for PDF output
- [ ] Use `output.draw_style=fill_shapes` (default)
- [ ] Use `output.shape_stacking=stacked` (default)
- [ ] Consider `output.gap_filler.enabled=true` for print quality
- [ ] Set `output.size.output_dpi=300` for high quality
- [ ] Store `X-Image-Token` for potential format conversions
- [ ] Handle errors gracefully (check status codes)
- [ ] Verify auth credentials are correct
- [ ] Check remaining credits before processing

---

**Last Updated:** November 17, 2025
