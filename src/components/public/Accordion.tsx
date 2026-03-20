'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccordionItem {
  question: string;
  answer: string;
}

interface AccordionProps {
  items: AccordionItem[];
  className?: string;
}

export function Accordion({ items, className }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className={cn('divide-y divide-gray-200', className)}>
      {items.map((item, i) => (
        <div key={i}>
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-gray-900 hover:text-gray-700 transition-colors"
          >
            <span className="pr-4">{item.question}</span>
            <ChevronDown
              className={cn(
                'w-4 h-4 flex-shrink-0 text-gray-400 transition-transform duration-300',
                openIndex === i && 'rotate-180'
              )}
            />
          </button>
          <div
            className={cn(
              'overflow-hidden transition-all duration-300',
              openIndex === i ? 'max-h-96 pb-4' : 'max-h-0'
            )}
          >
            <p className="text-sm text-gray-500 leading-relaxed">{item.answer}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
