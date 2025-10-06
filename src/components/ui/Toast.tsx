'use client';

import React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { X, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToastProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: React.ReactNode;
}

const variantStyles = {
  default: 'bg-white border-gray-200',
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const variantIcons = {
  default: null,
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

export function Toast({
  open,
  onOpenChange,
  title,
  description,
  variant = 'default',
  duration = 5000,
  action,
}: ToastProps) {
  const Icon = variantIcons[variant];

  return (
    <ToastPrimitive.Provider duration={duration}>
      <ToastPrimitive.Root
        open={open}
        onOpenChange={onOpenChange}
        className={cn(
          'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-6 pr-8 shadow-lg transition-all',
          'data-[swipe=move]:transition-none data-[swipe=cancel]:transition-none',
          'data-[swipe=end]:animate-out data-[state=closed]:animate-out',
          'data-[swipe=end]:slide-out-to-right-full data-[state=closed]:slide-out-to-right-full',
          'data-[state=open]:animate-in data-[state=open]:slide-in-from-top-full',
          variantStyles[variant]
        )}
      >
        <div className="flex items-center space-x-3">
          {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
          <div className="flex-1">
            <ToastPrimitive.Title className="text-sm font-semibold">
              {title}
            </ToastPrimitive.Title>
            {description && (
              <ToastPrimitive.Description className="mt-1 text-sm opacity-90">
                {description}
              </ToastPrimitive.Description>
            )}
          </div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
        <ToastPrimitive.Close className="absolute right-2 top-2 rounded-md p-1 opacity-0 transition-opacity hover:text-gray-500 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100">
          <X className="h-4 w-4" />
        </ToastPrimitive.Close>
      </ToastPrimitive.Root>
      <ToastPrimitive.Viewport className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]" />
    </ToastPrimitive.Provider>
  );
}

// Toast Provider for managing multiple toasts
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastPrimitive.Provider>
      {children}
      <ToastPrimitive.Viewport className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]" />
    </ToastPrimitive.Provider>
  );
}

export { ToastPrimitive };
