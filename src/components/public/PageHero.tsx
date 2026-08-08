import React from 'react';

interface PageHeroProps {
  heading: string;
  subheading?: string;
  children?: React.ReactNode;
}

export function PageHero({ heading, subheading, children }: PageHeroProps) {
  return (
    <div className="py-12 lg:py-16 text-center">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">
          {heading}
        </h1>
        {subheading && (
          <p className="mt-3 text-base text-gray-500 max-w-2xl mx-auto">
            {subheading}
          </p>
        )}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}
