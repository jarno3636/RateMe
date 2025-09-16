// /components/Nav.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import Connect from "./Connect"
import Logo from "./Logo"

function NavLink({
  href,
  children,
  onClick,
}: {
  href: string
  children: React.ReactNode
  onClick?: () => void
}) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "rounded-full px-4 py-2 text-sm transition",
        "border border-pink-500/50 hover:bg-pink-500/10",
        isActive ? "bg-pink-500/20 shadow-[0_0_10px_rgba(236,72,153,0.7)]" : "",
      ].join(" ")}
    >
      {children}
    </Link>
  )
}

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
          <NavLink href="/">Home</NavLink>
          <NavLink href="/discover">Discover</NavLink>
          <NavLink href="/creator">Become a creator</NavLink>
          <NavLink href="/me">My profile</NavLink>
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
            <NavLink href="/" onClick={() => setOpen(false)}>
              Home
            </NavLink>
            <NavLink href="/discover" onClick={() => setOpen(false)}>
              Discover
            </NavLink>
            <NavLink href="/creator" onClick={() => setOpen(false)}>
              Become a creator
            </NavLink>
            <NavLink href="/me" onClick={() => setOpen(false)}>
              My profile
            </NavLink>
          </div>
        </div>
      )}
    </header>
  )
}
