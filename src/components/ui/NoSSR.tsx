'use client';

import dynamic from 'next/dynamic';
import React from 'react';

interface NoSSRProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const NoSSRComponent: React.FC<NoSSRProps> = ({ children }) => {
  return <>{children}</>;
};

// Create a dynamic component with SSR disabled
const NoSSR = dynamic(() => Promise.resolve(NoSSRComponent), {
  ssr: false,
});

export default NoSSR;
