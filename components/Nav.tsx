// /components/Nav.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { useAccount } from "wagmi"
import { useProfilesByOwner, useGetProfile } from "@/hooks/useProfileRegistry"
import Connect from "./Connect"
import Logo from "./Logo"

const AVATAR_FALLBACK = "/avatar.png"

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
        "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition",
        "border border-pink-500/50 hover:bg-pink-500/10",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50",
        isActive ? "bg-pink-500/20 shadow-[0_0_10px_rgba(236,72,153,0.5)]" : "",
      ].join(" ")}
    >
      {children}
    </Link>
  )
}

function MiniAvatar({ src, size = 18, alt = "" }: { src?: string; size?: number; alt?: string }) {
  const [err, setErr] = useState(false)
  const finalSrc = !err && (src?.trim() || AVATAR_FALLBACK) ? src : AVATAR_FALLBACK
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={finalSrc}
      width={size}
      height={size}
      alt={alt}
      className="h-[18px] w-[18px] rounded-full object-cover ring-1 ring-white/10"
      loading="eager"
      decoding="async"
      onError={() => setErr(true)}
    />
  )
}

export default function Nav() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const { address, isConnected } = useAccount()

  // Only query owned profiles when connected
  const { data: ownedIds } = useProfilesByOwner(
    isConnected && address ? (address as `0x${string}`) : undefined
  )

  // First owned profile id (if any)
  const myId = useMemo(() => {
    const ids = (ownedIds as bigint[] | undefined) ?? []
    return ids.length ? ids[0] : 0n
  }, [ownedIds])

  // Optionally read profile for avatar (only if we have an id)
  const { data: prof } = useGetProfile(myId > 0n ? myId : (undefined as unknown as bigint))
  const myAvatar = String((prof?.[3] as string) || "") || AVATAR_FALLBACK

  // Build the target for "My profile"
  const myProfileHref = useMemo(() => {
    if (myId && myId > 0n) return `/creator/${myId.toString()}`
    return "/creator" // onboarding / become a creator
  }, [myId])

  // Close mobile menu on route change
  const pathname = usePathname()
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Click-outside & Esc-to-close for mobile panel
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
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

      {/* Three-zone layout to prevent overlap: Left logo, center nav, right connect */}
      <div className="mx-auto grid h-16 max-w-5xl grid-cols-[auto,1fr,auto] items-center gap-3 px-4">
        {/* Left: logo */}
        <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="OnlyStars home">
          <Logo className="h-6 w-6 shrink-0" />
          <span className="truncate font-semibold tracking-wide">OnlyStars</span>
        </Link>

        {/* Center: desktop nav (never overlaps right column) */}
        <nav className="hidden min-w-0 justify-center md:flex" aria-label="Primary">
          <div className="flex max-w-full flex-wrap items-center gap-3">
            <NavLink href="/" activeWhenStartsWith>Home</NavLink>
            <NavLink href="/discover" activeWhenStartsWith>Discover</NavLink>
            <NavLink href="/creator" activeWhenStartsWith>Become a creator</NavLink>
            <NavLink href={myProfileHref} activeWhenStartsWith>
              {myId > 0n && (
                <span className="-ml-1 inline-flex items-center gap-2">
                  <MiniAvatar src={myAvatar} />
                  <span>My profile</span>
                </span>
              )}
              {myId === 0n && "My profile"}
            </NavLink>
          </div>
        </nav>

        {/* Right: Connect (desktop) + Menu (mobile) */}
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <Connect />
          </div>
          {/* Mobile: connect + menu */}
          <div className="md:hidden flex items-center gap-2">
            <Connect compact />
            <button
              type="button"
              aria-label="Menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="rounded-full border border-white/15 p-2 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
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
