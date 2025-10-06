import React from 'react';
import { cn } from '@/lib/utils';

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse';
  text?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export function Loading({
  size = 'md',
  variant = 'spinner',
  text,
  className,
}: LoadingProps) {
  const renderSpinner = () => (
    <svg
      className={cn('animate-spin', sizeClasses[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  const renderDots = () => (
    <div className={cn('flex space-x-1', className)}>
      <div
        className={cn(
          'animate-bounce',
          sizeClasses[size],
          'bg-current rounded-full'
        )}
        style={{ animationDelay: '0ms' }}
      />
      <div
        className={cn(
          'animate-bounce',
          sizeClasses[size],
          'bg-current rounded-full'
        )}
        style={{ animationDelay: '150ms' }}
      />
      <div
        className={cn(
          'animate-bounce',
          sizeClasses[size],
          'bg-current rounded-full'
        )}
        style={{ animationDelay: '300ms' }}
      />
    </div>
  );

  const renderPulse = () => (
    <div
      className={cn(
        'animate-pulse bg-current rounded-full',
        sizeClasses[size],
        className
      )}
    />
  );

  const renderContent = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      default:
        return renderSpinner();
    }
  };

  if (text) {
    return (
      <div className="flex flex-col items-center justify-center space-y-2">
        {renderContent()}
        <p className="text-sm text-gray-500">{text}</p>
      </div>
    );
  }

  return renderContent();
}

// Full screen loading overlay
export function LoadingOverlay({
  text = 'Loading...',
  variant = 'spinner',
  size = 'lg',
}: {
  text?: string;
  variant?: LoadingProps['variant'];
  size?: LoadingProps['size'];
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-4">
        <Loading variant={variant} size={size} />
        <p className="text-lg font-medium text-gray-700">{text}</p>
      </div>
    </div>
  );
}

// Loading skeleton for content
export function LoadingSkeleton({
  className,
  lines = 1,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 rounded animate-pulse"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
}
