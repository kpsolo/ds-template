import type {Metadata} from 'next';
import {Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono} from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'TokenOps Studio — kpsolo/ds-template Audit & Workbench',
  description:
    'Interactive architecture audit, bug remediation patches, WCAG contrast matrix, and live multi-brand DTCG token compiler workbench for kpsolo/ds-template.',
  openGraph: {
    title: 'TokenOps Studio — kpsolo/ds-template Audit & Workbench',
    description:
      'Interactive architecture audit, bug remediation patches, WCAG contrast matrix, and live multi-brand DTCG token compiler workbench for kpsolo/ds-template.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TokenOps Studio — kpsolo/ds-template Audit & Workbench',
    description:
      'Interactive architecture audit, bug remediation patches, WCAG contrast matrix, and live multi-brand DTCG token compiler workbench for kpsolo/ds-template.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="bg-slate-50 text-slate-900 antialiased selection:bg-blue-600 selection:text-white"
        style={{fontFamily: 'var(--font-sans), sans-serif'}}
      >
        {children}
      </body>
    </html>
  );
}
