// /components/Nav.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { useAccount } from "wagmi"
import { useProfilesByOwner } from "@/hooks/useProfileRegistry"
import Connect from "./Connect"
import Logo from "./Logo"

function NavLink({
  href,
  children,
  onClick,
  activeWhenStartsWith = false,
}: {
  href: string
  children: React.ReactNode
  onClick?: () => void
  /** If true, mark active when pathname startsWith href (good for section roots) */
  activeWhenStartsWith?: boolean
}) {
  const pathname = usePathname() || "/"
  const isActive = activeWhenStartsWith
    ? pathname === href || pathname.startsWith(`${href}/`)
    : pathname === href

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
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
  const panelRef = useRef<HTMLDivElement | null>(null)
  const { address, isConnected } = useAccount()

  // If connected, fetch owned profile IDs; otherwise don't query.
  const { data: ownedIds } = useProfilesByOwner(
    isConnected && address ? (address as `0x${string}`) : undefined
  )

  // Build the target for "My profile"
  const myProfileHref = useMemo(() => {
    const ids = (ownedIds as bigint[] | undefined) ?? []
    if (ids.length > 0) return `/creator/${ids[0].toString()}`
    return "/creator" // onboarding / become a creator
  }, [ownedIds])

  // Close mobile menu on route change (safer when user navigates from external state)
  const pathname = usePathname()
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Click-outside & Esc-to-close for mobile panel
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current) return
      if (!panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onClick)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onClick)
    }
  }, [open])

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur supports-[backdrop-filter]:bg-black/50">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:rounded-md focus:bg-pink-600 focus:px-3 focus:py-1.5"
      >
        Skip to content
      </a>

      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        {/* Left: logo + title */}
        <Link href="/" className="flex items-center gap-2" aria-label="OnlyStars home">
          <Logo className="h-6 w-6" />
          <span className="font-semibold tracking-wide">OnlyStars</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-3 md:flex" aria-label="Primary">
          <NavLink href="/" activeWhenStartsWith>
            Home
          </NavLink>
          <NavLink href="/discover" activeWhenStartsWith>
            Discover
          </NavLink>
          <NavLink href="/creator" activeWhenStartsWith>
            Become a creator
          </NavLink>
          <NavLink href={myProfileHref} activeWhenStartsWith>
            My profile
          </NavLink>
          <Connect />
        </nav>

        {/* Mobile: hamburger + connect */}
        <div className="flex items-center gap-2 md:hidden">
          <Connect compact />
          <button
            type="button"
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
        <div className="mx-auto max-w-5xl px-4 pb-3 md:hidden" ref={panelRef}>
          <div
            className="mt-2 rounded-2xl border border-white/10 bg-black/70 p-3 shadow-lg"
            role="dialog"
            aria-label="Mobile navigation"
          >
            {/* 2-column compact pill grid */}
            <div className="grid grid-cols-2 gap-2">
              <Link
                className="truncate rounded-full border border-pink-500/40 px-3 py-1.5 text-center text-xs hover:bg-pink-500/10"
                href="/"
                onClick={() => setOpen(false)}
              >
                Home
              </Link>
              <Link
                className="truncate rounded-full border border-pink-500/40 px-3 py-1.5 text-center text-xs hover:bg-pink-500/10"
                href="/discover"
                onClick={() => setOpen(false)}
              >
                Discover
              </Link>
              <Link
                className="truncate rounded-full border border-pink-500/40 px-3 py-1.5 text-center text-xs hover:bg-pink-500/10"
                href="/creator"
                onClick={() => setOpen(false)}
              >
                Become a creator
              </Link>
              <Link
                className="truncate rounded-full border border-pink-500/40 px-3 py-1.5 text-center text-xs hover:bg-pink-500/10"
                href={myProfileHref}
                onClick={() => setOpen(false)}
              >
                My profile
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
