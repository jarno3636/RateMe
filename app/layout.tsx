// app/layout.tsx
import './globals.css';
import Nav from '@/components/Nav';
import dynamic from 'next/dynamic';

export const metadata = {
  title: 'OnlyStars',
  description: 'Creator subscriptions + paid posts + on-chain ratings (Base + USDC)',
};

// Load the whole provider tree on the client to avoid any SSR storage access
const Providers = dynamic(() => import('./providers'), { ssr: false });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <Providers>
          <Nav />
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
