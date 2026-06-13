/**
 * Owner's Manual content — single source of structured data for the in-app
 * Owner's Manual page at /dashboard/owner-manual.
 *
 * Content is derived from TOOL_TUTORIAL_CONTENT.md and the live tool behavior.
 * Do not change credit costs here unless the app logic proves the value is
 * outdated (verified: background removal 1, upscale 1, vectorize 2, color
 * change limited-free-then-credits, DPI checker free).
 */

export interface ManualStep {
  title: string;
  body: string;
}

export interface ManualSettingItem {
  label: string;
  description: string;
}

export interface ManualTroubleshootItem {
  issue: string;
  solution: string;
}

export interface ManualToolSection {
  /** Anchor id, e.g. 'background-removal'. */
  id: string;
  /** Short label for the table of contents / quick-nav chips. */
  navLabel: string;
  title: string;
  subtitle: string;
  image: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
  orientation: 'portrait' | 'landscape';
  overview: string;
  steps: ManualStep[];
  settings?: { title: string; items: ManualSettingItem[] };
  /** Optional bulk-mode note. */
  bulk?: string;
  tips: string[];
  creditCost: string;
  troubleshooting: ManualTroubleshootItem[];
}

/** Maps a tool route key (used by NeedHelpButton on tool pages) to its anchor. */
export const TOOL_ANCHORS: Record<string, string> = {
  'background-removal': 'background-removal',
  upscale: 'upscaling',
  vectorize: 'vectorization',
  'color-change': 'color-changing',
  'dpi-checker': 'dpi-checker',
};

export const TOOL_MANUAL_SECTIONS: ManualToolSection[] = [
  {
    id: 'background-removal',
    navLabel: 'Background Removal',
    title: 'Background Removal',
    subtitle:
      'Learn how to remove backgrounds, refine edges with Keep and Remove markers, and download a transparent PNG.',
    image: '/branding/background-removal.png',
    imageAlt:
      'Background Removal tutorial graphic showing the upload, edit, refine, and save steps',
    imageWidth: 1122,
    imageHeight: 1402,
    orientation: 'portrait',
    overview:
      'Background Removal isolates your design from its background and saves it as a transparent PNG — the format you need for clean DTF transfers. The tool uses an AI-assisted editor (ClippingMagic) that removes the background automatically and then lets you fine-tune the result by hand.',
    steps: [
      {
        title: 'Add your image',
        body: 'Upload an image (PNG, JPEG, or WebP) from the Process page, or arrive here with an image already loaded from your gallery or another tool.',
      },
      {
        title: 'Open the editor',
        body: 'Click Remove Background. Your image uploads to the ClippingMagic editor, which opens in a popup window.',
      },
      {
        title: 'Let the AI do the first pass',
        body: 'The background is removed automatically when the editor opens.',
      },
      {
        title: 'Refine the edges',
        body: 'Use the Keep (green) marker to paint back any part of your design that was removed by mistake, and the Remove (red) marker to erase any leftover background.',
      },
      {
        title: 'Finish',
        body: 'Click Done in the editor. The processed image, with a transparent background, is saved to your gallery as a PNG.',
      },
    ],
    bulk: 'Switch to Bulk Upload to remove backgrounds from many images at once. Process the batch, review the results, flag any that need re-editing, then download everything together as a ZIP file.',
    tips: [
      'Results are always saved as PNG to preserve transparency.',
      'After removing the background, you can upscale or change colors on the result without starting over.',
      'Make sure popups are allowed for this site — the editor opens in a popup window.',
    ],
    creditCost:
      '1 credit per image. Re-edits of the same image inside the ClippingMagic editor are free — they are covered by the original credit.',
    troubleshooting: [
      {
        issue: 'The editor did not open',
        solution:
          'Check that your browser is not blocking popups for the site, then click Remove Background again.',
      },
      {
        issue: 'Edges look rough',
        solution:
          'Re-open the editor and use the Keep (green) and Remove (red) markers to refine. Re-edits do not cost extra credits.',
      },
    ],
  },
  {
    id: 'upscaling',
    navLabel: 'Image Upscaling',
    title: 'Image Upscaling',
    subtitle:
      'Learn how to choose print size, review DPI, upscale to 300 DPI, and download your improved artwork.',
    image: '/branding/upscale.png',
    imageAlt:
      'Image Upscaling tutorial graphic showing print size selection, DPI, and processing modes',
    imageWidth: 1122,
    imageHeight: 1402,
    orientation: 'portrait',
    overview:
      "Upscaling increases your image's resolution so it prints sharp at your chosen size. For DTF, the target is 300 DPI — the print-quality gold standard. The tool calculates exactly how many pixels you need for your print size and enlarges the artwork to match.",
    steps: [
      {
        title: 'Add your image',
        body: 'Upload a new image or arrive from the Process page with one already loaded.',
      },
      {
        title: 'Choose your print size',
        body: 'Pick a preset (for example 8"×10", or a gang sheet like 22"×24") or enter custom dimensions. The tool calculates the exact pixel dimensions needed to hit 300 DPI at that size.',
      },
      {
        title: 'Pick a processing mode',
        body: 'Choose Auto Enhance, Generative Upscale, or Basic Upscale (see the options below).',
      },
      {
        title: 'Process and download',
        body: 'Click Process to upscale. The result is saved to your gallery automatically — download it, or send it to another tool for more work.',
      },
    ],
    settings: {
      title: 'Processing modes & print size',
      items: [
        {
          label: 'Auto Enhance',
          description: 'The best choice for most images; balanced quality.',
        },
        {
          label: 'Generative Upscale',
          description:
            'Adds AI-generated detail; best for very low-resolution images that need more than a simple enlargement.',
        },
        {
          label: 'Basic Upscale',
          description:
            'The fastest option; best for simple graphics and flat designs.',
        },
        {
          label: 'Print size presets',
          description:
            'Gang-sheet sizes (e.g. 22"×24", 22"×60") are pre-configured for common DTF film widths.',
        },
        {
          label: 'Custom print dimensions',
          description:
            'Type exact width and height to target any size at 300 DPI.',
        },
      ],
    },
    bulk: 'Switch to Bulk Upload to upscale many images at once. Set print sizes individually per image, or apply one size to the whole batch.',
    tips: [
      'For DTF printing, 300 DPI is the standard. The built-in DPI calculator shows exactly what scale factor your image needs.',
      'Gang-sheet presets save time and match common DTF film widths.',
    ],
    creditCost: '1 credit per image, regardless of the scale factor.',
    troubleshooting: [
      {
        issue: 'Still looks soft after upscaling',
        solution:
          'The source may be extremely low-resolution — try Generative Upscale for more added detail.',
      },
      {
        issue: 'Not sure if it is print-ready',
        solution:
          'Run the result through the DPI Checker for your target print size.',
      },
    ],
  },
  {
    id: 'vectorization',
    navLabel: 'Vectorization',
    title: 'Vectorization',
    subtitle:
      'Learn how to choose SVG, PDF, or PNG and convert raster artwork into cleaner files.',
    image: '/branding/vectorize.png',
    imageAlt:
      'Vectorization tutorial graphic showing format selection and raster-to-vector conversion',
    imageWidth: 1122,
    imageHeight: 1402,
    orientation: 'portrait',
    overview:
      'Vectorization converts a raster image (made of pixels) into clean vector paths that scale to any size without losing quality — ideal for logos, text, and simple graphics that need to be resized freely or printed crisply.',
    steps: [
      {
        title: 'Upload your image',
        body: 'Add a raster image (PNG, JPEG, or WebP) you want to convert.',
      },
      {
        title: 'Choose your output format',
        body: 'Select SVG, PDF, or PNG (see the options below).',
      },
      {
        title: 'Vectorize',
        body: 'Click Vectorize. The AI traces your image into clean vector paths that scale to any size.',
      },
      {
        title: 'Download',
        body: 'Save your file. SVG files can be opened and edited in Adobe Illustrator, Inkscape, or any vector editor.',
      },
    ],
    settings: {
      title: 'Output formats',
      items: [
        {
          label: 'SVG',
          description:
            'Scalable vector; best for editing in design software and for web use.',
        },
        {
          label: 'PDF',
          description:
            'Document format; best for print-ready sharing or universal document use.',
        },
        {
          label: 'PNG',
          description:
            'A 4× enlarged transparent raster export — not a fully editable vector.',
        },
      ],
    },
    tips: [
      'Works best on images with clean, solid colors and clear edges — logos, text, and simple graphics.',
      'For photographic images, vectorization produces a stylized result, not a photo-realistic copy.',
      'Remove the background first for cleaner vector results.',
    ],
    creditCost: '2 credits per image.',
    troubleshooting: [
      {
        issue: 'Result looks blocky or odd',
        solution:
          'The source image may be too detailed or photographic — vectorization is designed for flat, graphic artwork. For photo-style images, use Upscaling instead.',
      },
      {
        issue: 'Need to edit individual shapes',
        solution:
          'Download the SVG and open it in a vector editor like Illustrator or Inkscape.',
      },
    ],
  },
  {
    id: 'color-changing',
    navLabel: 'Color Changing',
    title: 'Color Changing',
    subtitle:
      'Learn how to select a target color, choose a replacement color, apply the change, and download updated artwork.',
    image: '/branding/color-change.png',
    imageAlt:
      'Color Changing tutorial graphic showing target color selection and replacement',
    imageWidth: 1122,
    imageHeight: 1402,
    orientation: 'portrait',
    overview:
      'The Color Changer swaps one color in your artwork for another — useful for recoloring a design to match brand colors or to create variations without redrawing it.',
    steps: [
      {
        title: 'Open your image',
        body: 'Arrive here with an image from the Process page or your gallery.',
      },
      {
        title: 'Select the target color',
        body: 'Choose the color in the artwork you want to change.',
      },
      {
        title: 'Choose the replacement color',
        body: 'Pick the new color to apply.',
      },
      {
        title: 'Apply the change',
        body: 'The selected color is replaced throughout the artwork.',
      },
      {
        title: 'Download / save',
        body: 'Save the updated artwork to your gallery.',
      },
    ],
    tips: [
      'Works best on artwork with distinct, solid color areas.',
      'If you see a low-resolution warning, consider upscaling first so the recolored result prints sharp.',
    ],
    creditCost:
      'Free users get a limited number of color changes per cycle; beyond that, color changes use credits, or you can upgrade your plan for more. The tool shows your remaining uses as you work.',
    troubleshooting: [
      {
        issue: 'The change spilled into areas you did not want',
        solution:
          'Adjacent colors that are very similar can be affected together — start from a clean, high-contrast image for the best color separation.',
      },
      {
        issue: 'Result looks soft',
        solution: 'Upscale the image first, then recolor.',
      },
    ],
  },
  {
    id: 'dpi-checker',
    navLabel: 'DPI Checker',
    title: 'DPI Checker',
    subtitle:
      'Learn how to check whether your artwork is sharp enough for your chosen DTF print size.',
    image: '/branding/DPI-Checker.png',
    imageAlt:
      'DPI Checker tutorial graphic showing print size entry and the effective DPI result',
    imageWidth: 1536,
    imageHeight: 1024,
    orientation: 'landscape',
    overview:
      'The DPI Checker tells you whether your artwork has enough resolution to print sharp at the size you intend. DTF transfers look best at 300 DPI — this tool does the math so you know before you print.',
    steps: [
      {
        title: 'Add or select your artwork',
        body: 'Bring in the image you plan to print.',
      },
      {
        title: 'Enter your intended print size',
        body: 'Type the width and height you want to print at.',
      },
      {
        title: 'Review the result',
        body: 'The checker calculates the effective DPI at that print size and tells you whether it meets the 300 DPI target.',
      },
      {
        title: 'Act on the result',
        body: 'If it is below target, upscale the image (or print it smaller) before sending it to film.',
      },
    ],
    tips: [
      '300 DPI is the quality bar for DTF — aim for it or higher.',
      'If your artwork falls short, run it through the Upscaling tool at your target print size, then re-check.',
    ],
    creditCost: 'Free.',
    troubleshooting: [
      {
        issue: 'Below 300 DPI',
        solution:
          'Either reduce the print size or upscale the artwork to add resolution, then re-check.',
      },
    ],
  },
];

export interface WorkflowStep {
  step: number;
  title: string;
  body: string;
  anchor: string;
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    step: 1,
    title: 'Remove Background',
    body: 'Use this first when the artwork has a messy or unwanted background.',
    anchor: 'background-removal',
  },
  {
    step: 2,
    title: 'Color Change',
    body: 'Use this when the artwork needs a color swapped or adjusted.',
    anchor: 'color-changing',
  },
  {
    step: 3,
    title: 'Upscale',
    body: 'Use this when the image is low resolution or needs to be prepared for a larger print size.',
    anchor: 'upscaling',
  },
  {
    step: 4,
    title: 'DPI Checker',
    body: 'Use this to confirm whether the artwork is sharp enough for the intended print size.',
    anchor: 'dpi-checker',
  },
  {
    step: 5,
    title: 'Vectorize',
    body: 'Use this for logos, text, and simple graphics that need clean scalable output.',
    anchor: 'vectorization',
  },
];

export const QUICK_START_STEPS: string[] = [
  'Upload or choose artwork',
  'Choose the tool that matches the issue',
  'Process the image',
  'Review the result',
  'Download or send the result to another tool',
];

export interface CreditRow {
  tool: string;
  cost: string;
  anchor: string;
}

export const CREDIT_ROWS: CreditRow[] = [
  { tool: 'DPI Checker', cost: 'Free', anchor: 'dpi-checker' },
  {
    tool: 'Background Removal',
    cost: '1 credit per image',
    anchor: 'background-removal',
  },
  {
    tool: 'Image Upscaling',
    cost: '1 credit per image',
    anchor: 'upscaling',
  },
  {
    tool: 'Vectorization',
    cost: '2 credits per image',
    anchor: 'vectorization',
  },
  {
    tool: 'Color Changing',
    cost: 'Limited free color changes per cycle; then uses credits or requires a plan upgrade depending on account limits.',
    anchor: 'color-changing',
  },
];

export const GENERAL_TROUBLESHOOTING: string[] = [
  'Allow popups for Background Removal — its editor opens in a popup window.',
  'Start with the highest quality image possible.',
  'Use Upscaling before printing low-resolution artwork.',
  'Use the DPI Checker before sending artwork to production.',
  'Use Vectorization for logos and simple graphics.',
  'Use Upscaling instead of Vectorization for photo-style artwork.',
];

export interface TocItem {
  id: string;
  label: string;
}

/** Order of sections in the table of contents and quick-nav chips. */
export const TOC_ITEMS: TocItem[] = [
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'workflow', label: 'Suggested Workflow' },
  { id: 'background-removal', label: 'Background Removal' },
  { id: 'upscaling', label: 'Image Upscaling' },
  { id: 'vectorization', label: 'Vectorization' },
  { id: 'color-changing', label: 'Color Changing' },
  { id: 'dpi-checker', label: 'DPI Checker' },
  { id: 'credits', label: 'Credit Costs' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
  { id: 'need-more-help', label: 'Need More Help?' },
];

/** Shorter labels for the pill-style quick-nav chips near the top. */
export const QUICK_NAV_CHIPS: TocItem[] = [
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'background-removal', label: 'Background Removal' },
  { id: 'upscaling', label: 'Upscaling' },
  { id: 'vectorization', label: 'Vectorization' },
  { id: 'color-changing', label: 'Color Changing' },
  { id: 'dpi-checker', label: 'DPI Checker' },
  { id: 'credits', label: 'Credits' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
];
