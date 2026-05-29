import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Robu Terminal',
  description: 'Institutional-grade stock valuation for Indian equities — NSE & BSE',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    viewportFit: 'cover',
  },
  themeColor: '#131722',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Robu Terminal',
  },
};

// Inline script runs synchronously before first paint — prevents flash of wrong theme
const antiFlashScript = `
(function(){
  try {
    var t = localStorage.getItem('robu-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  } catch(e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        {/* Anti-flash: set theme before paint so there's no white flicker */}
        <script dangerouslySetInnerHTML={{ __html: antiFlashScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Inter — industry standard for professional data UIs (Bloomberg, Stripe, Linear) */}
        {/* IBM Plex Mono — tabular numbers, designed for data display */}
        {/* DM Sans — TradingView-style geometric sans-serif */}
        {/* IBM Plex Mono — tabular numbers for financial data */}
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-terminal text-primary min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
