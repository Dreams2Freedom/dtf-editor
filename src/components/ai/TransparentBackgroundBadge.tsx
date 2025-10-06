'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle } from 'lucide-react';

interface TransparentBackgroundBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

/**
 * Badge component indicating that transparent background is automatically applied
 * Used throughout the AI image generation wizard to reassure users
 */
export function TransparentBackgroundBadge({
  size = 'md',
  showIcon = true,
  className,
}: TransparentBackgroundBadgeProps) {
  return (
    <Badge variant="success" size={size} className={className}>
      {showIcon && <CheckCircle className="w-3 h-3 mr-1" />}
      Transparent BG
    </Badge>
  );
}

/**
 * Larger info notice about transparent background feature
 * Used for prominent placement in wizard steps
 */
export function TransparentBackgroundNotice({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={`bg-success-50 border border-success-200 rounded-lg p-3 ${className || ''}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle className="w-4 h-4 text-success-600" />
        <span className="text-sm font-medium text-success-900">
          Automatic Transparent Background
        </span>
      </div>
      <p className="text-xs text-success-700 ml-6">
        All images are automatically generated with transparent backgrounds -
        perfect for DTF printing. No need to specify this in your prompt!
      </p>
    </div>
  );
}

/**
 * Inline text indicator for transparent background feature
 * Used in smaller contexts or inline with other content
 */
export function TransparentBackgroundInline({
  className,
}: {
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs text-success-700 ${className || ''}`}
    >
      <CheckCircle className="w-3 h-3" />
      <span className="font-medium">Transparent BG included</span>
    </span>
  );
}
