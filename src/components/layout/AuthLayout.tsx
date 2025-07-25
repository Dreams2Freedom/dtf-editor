'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Auth form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Logo */}
          <div className="text-center">
            <Link href="/" className="inline-block">
              <div className="flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="DTF Editor Logo"
                  width={48}
                  height={48}
                  className="h-12 w-auto"
                />
                <span className="ml-3 text-2xl font-bold text-gray-900">
                  DTF Editor
                </span>
              </div>
            </Link>
          </div>

          {/* Auth content */}
          {children}
        </div>
      </div>

      {/* Right side - Hero image */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 h-full w-full">
          <Image
            src="/auth-hero.jpg"
            alt="DTF Editor Hero"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-primary-600 mix-blend-multiply" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white px-8">
            <h2 className="text-4xl font-bold mb-4">
              Transform Your Images with AI
            </h2>
            <p className="text-xl">
              Create print-ready DTF files with powerful AI tools. Upscale, remove backgrounds, and vectorize images with ease.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 