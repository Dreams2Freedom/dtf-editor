'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { ToolData } from '@/lib/publicData';
import { ToolMockup } from './ToolMockup';

interface ToolShowcaseProps {
  tool: ToolData;
  index: number; // Even = text left/image right, Odd = image left/text right (on desktop)
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  purple: 'bg-purple-50 text-purple-600',
  pink: 'bg-pink-50 text-pink-600',
  sky: 'bg-sky-50 text-sky-600',
};

export function ToolShowcase({ tool, index }: ToolShowcaseProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);

    return () => {
      observer.unobserve(el);
    };
  }, []);

  const isEven = index % 2 === 0;
  const pillColor = colorMap[tool.color] ?? 'bg-gray-50 text-gray-600';

  return (
    <div
      ref={ref}
      className={`py-12 lg:py-16 px-5 sm:px-6 lg:px-8 max-w-7xl mx-auto transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}
    >
      <div
        className={`flex flex-col gap-8 lg:gap-12 ${
          isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'
        }`}
      >
        {/* Text side */}
        <div className="flex-1 flex flex-col justify-center">
          {/* Category pill */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wide mb-3 w-fit ${pillColor}`}
          >
            <tool.icon className="h-3.5 w-3.5" />
            {tool.name}
          </span>

          {/* Headline */}
          <h3 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight mb-3">
            {tool.headline}
          </h3>

          {/* Copy */}
          <p className="text-sm lg:text-base text-gray-500 leading-relaxed mb-5">
            {tool.copy}
          </p>

          {/* Bullets */}
          <ul className="space-y-2.5">
            {tool.bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-sm text-gray-700">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Mockup side */}
        <div className="flex-1 flex items-center justify-center">
          <ToolMockup type={tool.mockupType} />
        </div>
      </div>
    </div>
  );
}
