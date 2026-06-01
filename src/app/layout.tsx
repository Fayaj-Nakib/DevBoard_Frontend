import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from 'next-themes';
import { Geist, Geist_Mono } from 'next/font/google';
import { cn } from '@/lib/utils';
import ClientToaster from '@/components/ClientToaster';

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: 'DevBoard',
  description: 'Project management for developers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(geistSans.variable, geistMono.variable)}
    >
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delay={300}>
            <AuthProvider>{children}</AuthProvider>
          </TooltipProvider>
          <ClientToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
