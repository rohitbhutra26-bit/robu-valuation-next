import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#EDE9E3',
};

export const metadata: Metadata = {
  title: 'Robu Terminal® | Indian Stock Analysis',
  description: 'Institutional-grade stock valuation for Indian equities — NSE & BSE',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Robu Terminal',
  },
};

// Anti-flash: applies saved theme before first paint
const antiFlashScript = `
(function(){
  try {
    var t = localStorage.getItem('robu-theme') || 'light';
    document.documentElement.setAttribute('data-theme', t);
    var m = localStorage.getItem('robu-mode') || 'simple';
    document.documentElement.setAttribute('data-mode', m);
  } catch(e) {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.setAttribute('data-mode', 'simple');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" data-mode="simple">
      <head>
        <script dangerouslySetInnerHTML={{ __html: antiFlashScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Lora — editorial serif for headings and logo */}
        {/* DM Sans — clean geometric sans for UI */}
        {/* IBM Plex Mono — tabular numbers for financial data */}
        <link
          href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-terminal text-primary min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
