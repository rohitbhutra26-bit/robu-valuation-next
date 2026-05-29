'use client';

import { useEffect } from 'react';

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Force scroll — override any global CSS overflow trapping
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.cssText += '; overflow: auto !important;';
    body.style.cssText += '; overflow: auto !important; height: auto !important;';

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  return <>{children}</>;
}
