import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Education Board Result',
  description: 'Web Based Result Publication System for Bangladesh Education Board (JSC/JDC/SSC/DAKHIL/HSC/ALIM/Equivalent).',
  openGraph: {
    title: 'Education Board Result',
    description: 'Web Based Result Publication System for Bangladesh Education Board (JSC/JDC/SSC/DAKHIL/HSC/ALIM/Equivalent).',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Education Board Result',
    description: 'Web Based Result Publication System for Bangladesh Education Board (JSC/JDC/SSC/DAKHIL/HSC/ALIM/Equivalent).',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
