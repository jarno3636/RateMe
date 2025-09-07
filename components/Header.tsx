'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const nav = [
  { href: '/', label: 'Home' },
  { href: '/discover', label: 'Discover' },
  { href: '/creator', label: 'Become a Creator' },
  { href: '/mini', label: 'Open Mini App' },
  { href: '/about', label: 'About' },
  { href: '/instructions', label: 'Instructions' },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/70 backdrop-blur supports-[backdrop-filter]:bg-slate-950/50">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-2 font-semibold">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-fuchsia-500/60 to-cyan-500/60 text-[13px] ring-1 ring-white/20">
            😈
          </span>
          <span className="tracking-tight group-hover:text-white">Rate<span className="text-cyan-300">Me</span></span>
        </Link>

        {/* Desktop nav */}
        <nav className="ml-6 hidden items-center gap-5 md:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-sm text-slate-300 hover:text-white"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Wallet */}
        <div className="hidden md:block">
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
        </div>

        {/* Mobile toggles */}
        <button
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center rounded-lg border border-white/10 p-2 md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-nav"
        className={`md:hidden ${open ? 'block' : 'hidden'}`}
      >
        <div className="space-y-1 border-t border-white/10 px-4 py-3">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
            >
              {n.label}
            </Link>
          ))}
          <div className="mt-2 rounded-lg border border-white/10 bg-white/5 p-3">
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
          </div>
        </div>
      </div>
    </header>
  );
}
