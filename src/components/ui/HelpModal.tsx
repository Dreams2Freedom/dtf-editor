'use client';

import React, { useState, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpStep {
  title: string;
  content: string | React.ReactNode;
}

interface HelpModalProps {
  /** Unique key for localStorage persistence (e.g., 'help_upscale') */
  storageKey: string;
  /** Tool/page title shown in the modal header */
  title: string;
  /** Ordered list of steps */
  steps: HelpStep[];
  /** Optional tips shown at the bottom */
  tips?: string[];
  /** Icon color class (e.g., 'text-blue-600') */
  accentColor?: string;
  /** Background color class for step numbers (e.g., 'bg-blue-500') */
  accentBg?: string;
}

export function HelpModal({
  storageKey,
  title,
  steps,
  tips,
  accentColor = 'text-amber-600',
  accentBg = 'bg-amber-500',
}: HelpModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(true); // default true to prevent flash

  // Check localStorage on mount — auto-show if never seen
  useEffect(() => {
    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      setIsOpen(true);
      setHasBeenShown(false);
    } else {
      setHasBeenShown(true);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    setIsOpen(false);
    if (!hasBeenShown) {
      localStorage.setItem(storageKey, 'true');
      setHasBeenShown(true);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
  };

  return (
    <>
      {/* Help button — always visible */}
      <button
        onClick={handleOpen}
        className={`p-1.5 rounded-lg ${accentColor} hover:bg-gray-100 transition-colors`}
        title="How to use"
      >
        <HelpCircle className="w-5 h-5" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={handleDismiss}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className={`w-5 h-5 ${accentColor}`} />
                <h2 className="text-lg font-bold text-gray-900">{title}</h2>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {steps.map((step, i) => (
                <div key={i}>
                  <div className="flex items-start gap-3 mb-2">
                    <span className={`w-6 h-6 ${accentBg} text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5`}>
                      {i + 1}
                    </span>
                    <h3 className="font-semibold text-gray-900">{step.title}</h3>
                  </div>
                  <div className="ml-9 text-sm text-gray-600 leading-relaxed">
                    {typeof step.content === 'string' ? <p>{step.content}</p> : step.content}
                  </div>
                </div>
              ))}

              {/* Tips */}
              {tips && tips.length > 0 && (
                <div className={`${accentBg}/10 border ${accentBg === 'bg-amber-500' ? 'border-amber-200' : 'border-gray-200'} rounded-xl p-4`}
                  style={{ backgroundColor: `var(--tip-bg, rgba(245,158,11,0.08))` }}
                >
                  <h3 className={`font-semibold ${accentColor} text-sm mb-2`}>Pro Tips</h3>
                  <ul className="space-y-1.5 text-gray-600 text-xs">
                    {tips.map((tip, i) => (
                      <li key={i}>• {tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-3">
              <button
                onClick={handleDismiss}
                className={`w-full py-2.5 ${accentBg} hover:opacity-90 text-white font-bold rounded-xl text-sm transition-all`}
              >
                Got it, let&apos;s go!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
