'use client';

import dynamic from 'next/dynamic';

// Dynamic import with ssr:false must live in a Client Component.
// This prevents the useTheme() value mismatch between server and client
// that triggers React hydration error #418.
const Toaster = dynamic(
  () => import('@/components/ui/sonner').then((m) => m.Toaster),
  { ssr: false },
);

export default function ClientToaster() {
  return <Toaster richColors position="bottom-right" />;
}
