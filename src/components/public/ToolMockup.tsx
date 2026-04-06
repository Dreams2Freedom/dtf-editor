interface ToolMockupProps {
  type:
    | 'upscale'
    | 'color-change'
    | 'bg-removal'
    | 'vectorize'
    | 'ai-generate'
    | 'bulk-process';
}

/* ------------------------------------------------------------------ */
/*  Individual mockup renderers                                       */
/* ------------------------------------------------------------------ */

function UpscaleMockup() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-center gap-3 sm:gap-5 w-full">
        {/* Before */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <div className="relative w-full aspect-square max-w-[140px] rounded-lg bg-red-50 border border-red-200 flex items-center justify-center overflow-hidden">
            <span
              className="text-4xl sm:text-5xl select-none"
              style={{ filter: 'blur(2px)' }}
            >
              🌸
            </span>
            <span className="absolute top-1.5 right-1.5 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
              72 DPI
            </span>
          </div>
          <span className="text-xs font-medium text-gray-400">Before</span>
        </div>

        {/* Arrow */}
        <span className="text-xl sm:text-2xl text-amber-500 font-bold shrink-0 mt-[-20px]">
          →
        </span>

        {/* After */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <div className="relative w-full aspect-square max-w-[140px] rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center overflow-hidden">
            <span className="text-4xl sm:text-5xl select-none">🌸</span>
            <span className="absolute top-1.5 right-1.5 rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
              300 DPI
            </span>
          </div>
          <span className="text-xs font-medium text-gray-400">After</span>
        </div>
      </div>
    </div>
  );
}

function ColorChangeMockup() {
  const colors = [
    { bg: 'bg-blue-500', ring: 'ring-blue-300' },
    { bg: 'bg-red-500', ring: 'ring-red-300' },
    { bg: 'bg-purple-500', ring: 'ring-purple-300' },
  ];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-center gap-2 sm:gap-4 w-full">
        {colors.map((c, i) => (
          <div key={i} className="contents">
            <div
              className={`flex-1 max-w-[100px] aspect-square rounded-xl ${c.bg} ring-2 ${c.ring} flex items-center justify-center shadow-sm`}
            >
              <span className="text-white text-2xl sm:text-3xl select-none drop-shadow">
                ★
              </span>
            </div>
            {i < colors.length - 1 && (
              <span className="text-amber-500 font-bold text-lg shrink-0">
                →
              </span>
            )}
          </div>
        ))}
      </div>
      <span className="text-xs font-medium text-gray-400 text-center">
        Same design → 3 products to sell
      </span>
    </div>
  );
}

function BgRemovalMockup() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-center gap-3 sm:gap-5 w-full">
        {/* Original */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <div className="w-full aspect-square max-w-[140px] rounded-lg bg-gray-300 flex items-center justify-center overflow-hidden">
            <span className="text-4xl sm:text-5xl select-none text-amber-500 drop-shadow-md">
              ★
            </span>
          </div>
          <span className="text-xs font-medium text-gray-400">Original</span>
        </div>

        {/* Arrow */}
        <span className="text-xl sm:text-2xl text-amber-500 font-bold shrink-0 mt-[-20px]">
          →
        </span>

        {/* Transparent */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <div
            className="w-full aspect-square max-w-[140px] rounded-lg flex items-center justify-center overflow-hidden border border-gray-200"
            style={{
              background:
                'repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 0 0/12px 12px',
            }}
          >
            <span className="text-4xl sm:text-5xl select-none text-amber-500 drop-shadow-md">
              ★
            </span>
          </div>
          <span className="text-xs font-medium text-gray-400">
            Transparent
          </span>
        </div>
      </div>
    </div>
  );
}

function VectorizeMockup() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-center gap-3 sm:gap-5 w-full">
        {/* Raster */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <div className="w-full aspect-square max-w-[140px] rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden p-4">
            {/* Pixelated square built with a grid of tiny blocks */}
            <div className="w-full h-full relative">
              <div
                className="w-full h-full bg-purple-500"
                style={{
                  clipPath:
                    'polygon(8% 0%, 92% 0%, 100% 8%, 100% 92%, 92% 100%, 8% 100%, 0% 92%, 0% 8%)',
                  imageRendering: 'pixelated',
                }}
              />
              {/* Stepped pixel edges */}
              <div className="absolute inset-0">
                <div className="absolute top-0 left-0 w-[8%] h-[8%] bg-gray-100" />
                <div className="absolute top-0 right-0 w-[8%] h-[8%] bg-gray-100" />
                <div className="absolute bottom-0 left-0 w-[8%] h-[8%] bg-gray-100" />
                <div className="absolute bottom-0 right-0 w-[8%] h-[8%] bg-gray-100" />
                {/* Extra pixel steps for a jagged look */}
                <div className="absolute top-[8%] left-0 w-[4%] h-[4%] bg-gray-100" />
                <div className="absolute top-0 left-[8%] w-[4%] h-[4%] bg-gray-100" />
                <div className="absolute top-[8%] right-0 w-[4%] h-[4%] bg-gray-100" />
                <div className="absolute top-0 right-[8%] w-[4%] h-[4%] bg-gray-100" />
                <div className="absolute bottom-[8%] left-0 w-[4%] h-[4%] bg-gray-100" />
                <div className="absolute bottom-0 left-[8%] w-[4%] h-[4%] bg-gray-100" />
                <div className="absolute bottom-[8%] right-0 w-[4%] h-[4%] bg-gray-100" />
                <div className="absolute bottom-0 right-[8%] w-[4%] h-[4%] bg-gray-100" />
              </div>
            </div>
          </div>
          <span className="text-xs font-medium text-gray-400">Raster</span>
        </div>

        {/* Arrow */}
        <span className="text-xl sm:text-2xl text-amber-500 font-bold shrink-0 mt-[-20px]">
          →
        </span>

        {/* Vector */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <div className="w-full aspect-square max-w-[140px] rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden p-4">
            <div className="w-full h-full rounded-xl bg-purple-500" />
          </div>
          <span className="text-xs font-medium text-gray-400">
            Vector (SVG)
          </span>
        </div>
      </div>
    </div>
  );
}

function AiGenerateMockup() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-center gap-3 sm:gap-5 w-full">
        {/* Prompt input */}
        <div className="flex-1 max-w-[180px]">
          <div className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 shadow-sm">
            <p className="text-[11px] sm:text-xs italic text-gray-400 leading-snug">
              A vintage rose design for a t-shirt...
            </p>
          </div>
        </div>

        {/* Arrow */}
        <span className="text-xl sm:text-2xl text-amber-500 font-bold shrink-0">
          →
        </span>

        {/* Generated output */}
        <div className="flex-1 max-w-[140px] aspect-square rounded-lg bg-gradient-to-br from-pink-300 via-rose-400 to-fuchsia-500 flex items-center justify-center shadow-md">
          <span className="text-3xl sm:text-4xl select-none drop-shadow">
            ✨
          </span>
        </div>
      </div>
    </div>
  );
}

function BulkProcessMockup() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-center gap-3 sm:gap-5 w-full">
        {/* Upload stack */}
        <div className="flex-1 flex justify-center">
          <div className="relative w-16 h-20 sm:w-20 sm:h-24">
            <div className="absolute top-0 left-0 w-12 h-14 sm:w-16 sm:h-18 rounded-md bg-gray-200 border border-gray-300 shadow-sm" />
            <div className="absolute top-1.5 left-1.5 w-12 h-14 sm:w-16 sm:h-18 rounded-md bg-gray-100 border border-gray-300 shadow-sm" />
            <div className="absolute top-3 left-3 w-12 h-14 sm:w-16 sm:h-18 rounded-md bg-white border border-gray-300 shadow-sm flex items-center justify-center">
              <span className="text-gray-400 text-xs sm:text-sm font-medium">
                PNG
              </span>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="w-16 sm:w-24 h-2.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500"
              style={{ width: '73%' }}
            />
          </div>
          <span className="text-[10px] font-semibold text-amber-600">73%</span>
        </div>

        {/* Done stack */}
        <div className="flex-1 flex justify-center">
          <div className="relative w-16 h-20 sm:w-20 sm:h-24">
            <div className="absolute top-0 left-0 w-12 h-14 sm:w-16 sm:h-18 rounded-md bg-emerald-50 border border-emerald-200 shadow-sm" />
            <div className="absolute top-1.5 left-1.5 w-12 h-14 sm:w-16 sm:h-18 rounded-md bg-emerald-50 border border-emerald-200 shadow-sm" />
            <div className="absolute top-3 left-3 w-12 h-14 sm:w-16 sm:h-18 rounded-md bg-white border border-emerald-300 shadow-sm flex items-center justify-center">
              <span className="text-emerald-500 text-sm sm:text-base font-bold">
                ✓
              </span>
            </div>
          </div>
        </div>
      </div>

      <span className="text-xs font-medium text-gray-400 text-center">
        Upload → Process → Done
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

const mockups: Record<ToolMockupProps['type'], () => JSX.Element> = {
  upscale: UpscaleMockup,
  'color-change': ColorChangeMockup,
  'bg-removal': BgRemovalMockup,
  vectorize: VectorizeMockup,
  'ai-generate': AiGenerateMockup,
  'bulk-process': BulkProcessMockup,
};

export function ToolMockup({ type }: ToolMockupProps) {
  const Mockup = mockups[type];

  return (
    <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 lg:p-6">
      <Mockup />
    </div>
  );
}
