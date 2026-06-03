import type { Metadata } from 'next';
import { Fira_Sans, Fira_Code } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

const firaSans = Fira_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-fira-sans',
});

const firaCode = Fira_Code({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-fira-code',
});

export const metadata: Metadata = {
  title: 'StayHub',
  description: 'Hotel management platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${firaSans.variable} ${firaCode.variable}`}>
      <body className="bg-bg text-white font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
