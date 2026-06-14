import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#F4F5F8',
};

export const metadata: Metadata = {
  title: 'Robu | Know any stock in plain English',
  description: 'Search any Indian stock and instantly see if it looks cheap, fair, or expensive — explained simply.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Robu',
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
        {/* Manrope — friendly geometric sans for everything (UI + headings) */}
        {/* IBM Plex Mono — tabular numbers for financial data */}
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-terminal text-primary min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
