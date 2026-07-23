# DTF Editor — Tool Tutorial Content

> **Purpose of this file:** plain-text educational copy for each DTF Editor tool,
> written to be paired with the matching tutorial graphic to produce an
> illustrated "owner's manual." Each section names the exact graphic to place
> with it. Copy is based on the live tool behavior in the app.

> **How to use (for the assembling agent):**
> - Each tool below has: the tutorial **graphic** to pair, a one-line
>   **subtitle**, an **overview**, **step-by-step** instructions, an
>   **options/settings** breakdown, **tips**, the **credit cost**, and
>   **troubleshooting**.
> - Place the named graphic at the top of each tool's manual page, then lay the
>   text beneath/around it.
> - Graphics live in `public/branding/` and are referenced publicly as
>   `/branding/<filename>`.

---

## Image map (tool → graphic)

| Tool                | Graphic file                         | Orientation        |
| ------------------- | ------------------------------------ | ------------------ |
| Background Removal  | `public/branding/background-removal.png` | Portrait 1122×1402 |
| Image Upscaling     | `public/branding/upscale.png`            | Portrait 1122×1402 |
| Vectorization       | `public/branding/vectorize.png`          | Portrait 1122×1402 |
| Color Changing      | `public/branding/color-change.png`       | Portrait 1122×1402 |
| DPI Checker         | `public/branding/DPI-Checker.png`        | Landscape 1536×1024 |

---

# 1. Background Removal

**Graphic to pair:** `public/branding/background-removal.png`

**Subtitle:** Learn how to remove backgrounds, refine edges with Keep and Remove markers, and download a transparent PNG.

### Overview
Background Removal isolates your design from its background and saves it as a
transparent PNG — the format you need for clean DTF transfers. The tool uses an
AI-assisted editor (ClippingMagic) that removes the background automatically and
then lets you fine-tune the result by hand.

### Step by step
1. **Add your image.** Upload an image (PNG, JPEG, or WebP) from the Process
   page, or arrive here with an image already loaded from your gallery or
   another tool.
2. **Open the editor.** Click **Remove Background**. Your image uploads to the
   ClippingMagic editor, which opens in a popup window.
3. **Let the AI do the first pass.** The background is removed automatically when
   the editor opens.
4. **Refine the edges.** Use the editor's markers to correct the result:
   - **Keep (green)** — paint over any part of your design that was removed by
     mistake to bring it back.
   - **Remove (red)** — paint over any leftover background to erase it.
5. **Finish.** Click **Done** in the editor. The processed image, with a
   transparent background, is saved to your gallery as a PNG.

### Bulk mode
Switch to **Bulk Upload** to remove backgrounds from many images at once.
Process the batch, review the results, flag any that need re-editing, then
download everything together as a ZIP file.

### Tips
- Results are always saved as **PNG** to preserve transparency.
- After removing the background, you can **upscale** or **change colors** on the
  result without starting over.
- Make sure **popups are allowed** for this site — the editor opens in a popup
  window.

### Credit cost
**1 credit per image.** Re-edits of the same image inside the ClippingMagic
editor are **free** — they're covered by the original credit.

### Troubleshooting
- **Editor didn't open?** Check that your browser isn't blocking popups for the
  site, then click Remove Background again.
- **Edges look rough?** Re-open the editor and use the Keep/Remove markers to
  refine — re-edits don't cost extra credits.

---

# 2. Image Upscaling

**Graphic to pair:** `public/branding/upscale.png`

**Subtitle:** Learn how to choose print size, review DPI, upscale to 300 DPI, and download your improved artwork.

### Overview
Upscaling increases your image's resolution so it prints sharp at your chosen
size. For DTF, the target is **300 DPI** — the print-quality gold standard. The
tool calculates exactly how many pixels you need for your print size and
enlarges the artwork to match.

### Step by step
1. **Add your image.** Upload a new image or arrive from the Process page with
   one already loaded.
2. **Choose your print size.** Pick a preset (for example 8"×10", or a gang
   sheet like 22"×24") or enter custom dimensions. The tool calculates the exact
   pixel dimensions needed to hit **300 DPI** at that size.
3. **Pick a processing mode** (see Options below).
4. **Process and download.** Click **Process** to upscale. The result is saved
   to your gallery automatically — download it, or send it to another tool for
   more work.

### Options / settings
- **Auto Enhance** — the best choice for most images; balanced quality.
- **Generative Upscale** — adds AI-generated detail; best for very low-resolution
  images that need more than a simple enlargement.
- **Basic Upscale** — the fastest option; best for simple graphics and flat
  designs.
- **Print size presets vs. custom** — gang-sheet sizes (e.g. 22"×24", 22"×60")
  are pre-configured for common DTF film widths; custom lets you type exact
  dimensions.

### Bulk mode
Switch to **Bulk Upload** to upscale many images at once. Set print sizes
individually per image, or apply one size to the whole batch.

### Tips
- For DTF printing, **300 DPI** is the standard. The built-in DPI calculator
  shows exactly what scale factor your image needs.
- Gang-sheet presets save time and match common film widths.

### Credit cost
**1 credit per image**, regardless of the scale factor.

### Troubleshooting
- **Still looks soft after upscaling?** The source may be extremely low-res — try
  **Generative Upscale** for more added detail.
- **Not sure if it's print-ready?** Run it through the **DPI Checker** for your
  target size.

---

# 3. Vectorization

**Graphic to pair:** `public/branding/vectorize.png`

**Subtitle:** Learn how to choose SVG, PDF, or PNG and convert raster artwork into cleaner files.

### Overview
Vectorization converts a raster image (made of pixels) into clean vector paths
that scale to **any size without losing quality** — ideal for logos, text, and
simple graphics that need to be resized freely or printed crisply.

### Step by step
1. **Upload your image.** Add a raster image (PNG, JPEG, or WebP) you want to
   convert.
2. **Choose your output format** (see Options below).
3. **Vectorize.** Click **Vectorize**. The AI traces your image into clean vector
   paths that scale to any size.
4. **Download.** Save your file. SVG files can be opened and edited in Adobe
   Illustrator, Inkscape, or any vector editor.

### Options / settings
- **SVG** — scalable vector; best for web use and editing in design software.
- **PDF** — document format; best for print-ready output.
- **PNG** — a 4× enlarged transparent raster export.

### Tips
- Works best on images with **clean, solid colors and clear edges** — logos,
  text, and simple graphics.
- For **photographic** images, vectorization produces a stylized result, not a
  photo-realistic copy.
- **Remove the background first** for cleaner vector results.

### Credit cost
**2 credits per image.**

### Troubleshooting
- **Result looks blocky or odd?** The source image may be too detailed or
  photographic — vectorization is designed for flat, graphic artwork.
- **Need to edit individual shapes?** Download the **SVG** and open it in a
  vector editor.

---

# 4. Color Changing

**Graphic to pair:** `public/branding/color-change.png`

**Subtitle:** Learn how to select a target color, choose a replacement color, apply the change, and download updated artwork.

### Overview
The Color Changer swaps one color in your artwork for another — useful for
recoloring a design to match brand colors or to create variations without
redrawing it.

### Step by step
1. **Open your image.** Arrive here with an image from the Process page or your
   gallery.
2. **Select the target color.** Choose the color in the artwork you want to
   change.
3. **Choose the replacement color.** Pick the new color to apply.
4. **Apply the change.** The selected color is replaced throughout the artwork.
5. **Download / save.** Save the updated artwork to your gallery.

### Tips
- Works best on artwork with **distinct, solid color areas**.
- If you see a **low-resolution warning**, consider **upscaling first** so the
  recolored result prints sharp.

### Credit cost
Free users get a limited number of color changes per cycle; beyond that, color
changes use credits (or you can upgrade your plan for more). The tool shows your
remaining uses as you work.

### Troubleshooting
- **The change spilled into areas you didn't want?** Adjacent colors that are very
  similar can be affected together — start from a clean, high-contrast image for
  best separation.
- **Result looks soft?** Upscale the image first, then recolor.

---

# 5. DPI Checker

**Graphic to pair:** `public/branding/DPI-Checker.png`

**Subtitle:** Learn how to check whether your artwork is sharp enough for your chosen DTF print size.

### Overview
The DPI Checker tells you whether your artwork has enough resolution to print
**sharp** at the size you intend. DTF transfers look best at **300 DPI** — this
tool does the math so you know before you print.

### Step by step
1. **Add or select your artwork.**
2. **Enter your intended print size** (width and height).
3. **Review the result.** The checker calculates the effective DPI at that print
   size and tells you whether it meets the 300 DPI target.
4. **Act on the result.** If it's below target, upscale the image (or print it
   smaller) before sending it to film.

### Tips
- **300 DPI** is the quality bar for DTF — aim for it or higher.
- If your artwork falls short, run it through the **Upscaling** tool at your
  target print size, then re-check.

### Credit cost
The DPI Checker is **free** to use.

### Troubleshooting
- **Below 300 DPI?** Either reduce the print size or upscale the artwork to add
  resolution.

---

## Cross-tool workflow (suggested manual section)

A common DTF prep flow, end to end:
1. **Remove Background** → isolate the design as a transparent PNG.
2. **Color Change** (optional) → recolor to match brand/variation.
3. **Upscale** → enlarge to your print size at 300 DPI.
4. **DPI Checker** → confirm it's print-ready at the chosen size.
5. **Vectorize** (optional) → for logos/simple graphics that need infinite
   scaling or vector files.

Each tool can hand its result to the next, so you don't have to re-upload between
steps.
