// /components/Nav.tsx
"use client"

import Link from "next/link"
import { useState } from "react"
import Connect from "./Connect"
import Logo from "./Logo"

export default function Nav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        {/* Left: logo + title */}
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <span className="font-semibold tracking-wide">OnlyStars</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-3 md:flex">
          <Link
            className="rounded-full border border-pink-500/50 px-4 py-2 text-sm hover:bg-pink-500/10"
            href="/discover"
          >
            Discover
          </Link>
          <Link
            className="rounded-full border border-pink-500/50 px-4 py-2 text-sm hover:bg-pink-500/10"
            href="/creator"
          >
            Become a creator
          </Link>
          <Link
            className="rounded-full border border-pink-500/50 px-4 py-2 text-sm hover:bg-pink-500/10"
            href="/me"
          >
            My profile
          </Link>

          <Connect />
        </nav>

        {/* Mobile: hamburger + connect */}
        <div className="flex items-center gap-2 md:hidden">
          <Connect compact />
          <button
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded-full border border-white/15 p-2 hover:bg-white/10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <div className="mx-auto max-w-5xl px-4 pb-3 md:hidden">
          <div className="mt-2 space-y-2 rounded-2xl border border-white/10 bg-black/70 p-3">
            <Link
              className="block rounded-xl px-3 py-2 text-sm hover:bg-white/10"
              href="/discover"
              onClick={() => setOpen(false)}
            >
              Discover
            </Link>
            <Link
              className="block rounded-xl px-3 py-2 text-sm hover:bg-white/10"
              href="/creator"
              onClick={() => setOpen(false)}
            >
              Become a creator
            </Link>
            <Link
              className="block rounded-xl px-3 py-2 text-sm hover:bg-white/10"
              href="/me"
              onClick={() => setOpen(false)}
            >
              My profile
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
