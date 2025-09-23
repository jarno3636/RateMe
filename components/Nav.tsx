// /components/Nav.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAccount } from "wagmi"
import { useProfilesByOwner, useGetProfile } from "@/hooks/useProfileRegistry"
import Connect from "./Connect"
import Logo from "./Logo"

const AVATAR_FALLBACK = "/avatar.png"

/** Narrow an array to a non-empty tuple so index [0] is safe even with noUncheckedIndexedAccess. */
function hasAtLeastOne<T>(arr: readonly T[] | undefined | null): arr is readonly [T, ...T[]] {
  return Array.isArray(arr) && arr.length > 0
}

function NavLink({
  href,
  children,
  onClick,
  activeWhenStartsWith = false,
}: {
  href: string
  children: React.ReactNode
  onClick?: React.MouseEventHandler<HTMLAnchorElement>
  /** If true, mark active when pathname startsWith href (good for section roots) */
  activeWhenStartsWith?: boolean
}) {
  const pathname = usePathname() || "/"
  const isActive = activeWhenStartsWith
    ? pathname === href || pathname.startsWith(`${href}/`)
    : pathname === href

  const clickProp = onClick ? { onClick } : {}

  return (
    <Link
      href={href}
      {...clickProp}
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

function MiniAvatar({
  src,
  size = 18,
  alt = "",
}: {
  src?: string
  size?: number
  alt?: string
}) {
  const [err, setErr] = useState(false)
  const finalSrc = !err && src && src.trim().length > 0 ? src : AVATAR_FALLBACK
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

/** Resolve site origin for share/cast links (client-safe). */
function getSiteOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin
  const env = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "")
  return env || "https://onlystars.app"
}

// Optional: tuple type so index access is explicit/safe.
type MaybeProfileTuple =
  | readonly [
      unknown,             // [0]
      unknown,             // [1]
      unknown,             // [2]
      string | undefined,  // [3] avatar URI
      unknown,             // [4]
      bigint | undefined   // [5] fid
    ]
  | undefined

export default function Nav() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const { address, isConnected } = useAccount()

  const { data: ownedIds } = useProfilesByOwner(
    isConnected && address ? (address as `0x${string}`) : undefined
  )

  const myId = useMemo<bigint>(() => {
    const list = ownedIds as readonly bigint[] | undefined
    return hasAtLeastOne(list) ? list[0] : 0n
  }, [ownedIds])

  const { data: profRaw } = useGetProfile(myId > 0n ? myId : undefined)
  const prof = profRaw as unknown as MaybeProfileTuple

  const myAvatar = useMemo(() => {
    const uri = (prof?.[3] ?? "") as string
    return uri || AVATAR_FALLBACK
  }, [prof])

  const myFid = useMemo(() => {
    const fid = prof?.[5]
    return typeof fid === "bigint" ? fid : 0n
  }, [prof])

  const myProfileHref = useMemo(() => {
    return myId > 0n ? `/creator/${myId.toString()}` : "/creator"
  }, [myId])

  const pathname = usePathname()
  useEffect(() => {
    setOpen(false)
  }, [pathname])

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

  const onCast = useCallback(() => {
    const origin = getSiteOrigin()
    const url = `${origin}${myProfileHref}`
    const text = encodeURIComponent("Check out my OnlyStars profile ✨")
    const embed = encodeURIComponent(url)
    const compose = `https://warpcast.com/~/compose?text=${text}&embeds[]=${embed}`
    window.open(compose, "_blank", "noopener,noreferrer")
  }, [myProfileHref])

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur supports-[backdrop-filter]:bg-black/50">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:rounded-md focus:bg-pink-600 focus:px-3 focus:py-1.5"
      >
        Skip to content
      </a>

      <div className="mx-auto grid h-16 max-w-5xl grid-cols-[auto,1fr,auto] items-center gap-3 px-4">
        {/* Left: logo */}
        <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="OnlyStars home">
          <Logo className="h-6 w-6 shrink-0" />
          <span className="truncate font-semibold tracking-wide">OnlyStars</span>
        </Link>

        {/* Center: desktop nav */}
        <nav className="hidden min-w-0 justify-center md:flex" aria-label="Primary">
          <div className="flex max-w-full flex-wrap items-center gap-3">
            <NavLink href="/" activeWhenStartsWith>Home</NavLink>
            <NavLink href="/discover" activeWhenStartsWith>Discover</NavLink>
            <NavLink href="/creator" activeWhenStartsWith>Become a creator</NavLink>
            <NavLink href={myProfileHref} activeWhenStartsWith>
              {myId > 0n && (
                <span className="-ml-1 inline-flex items-center gap-2">
                  <MiniAvatar src={myAvatar} alt="Your avatar" />
                  <span>My profile</span>
                </span>
              )}
              {myId === 0n && "My profile"}
            </NavLink>
            {/* ✅ Added About */}
            <NavLink href="/about" activeWhenStartsWith>About</NavLink>
          </div>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {myFid > 0n && (
            <button
              type="button"
              onClick={onCast}
              title="Cast to Farcaster"
              className={[
                "hidden md:inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs transition",
                "border border-violet-400/60 hover:bg-violet-400/10",
                "focus:outline-none focus:ring-2 focus:ring-violet-400/50",
              ].join(" ")}
            >
              <span aria-hidden className="block h-2 w-2 rounded-full bg-violet-400" />
              Cast
            </button>
          )}
          <div className="hidden md:block">
            <Connect />
          </div>
          <div className="md:hidden flex items-center gap-2">
            {myFid > 0n && (
              <button
                type="button"
                onClick={onCast}
                title="Cast to Farcaster"
                className="rounded-full border border-violet-400/60 p-2 hover:bg-violet-400/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
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

      {/* Mobile menu */}
      {open && (
        <div className="mx-auto max-w-5xl px-4 pb-3 md:hidden" ref={panelRef}>
          <div className="mt-2 rounded-2xl border border-white/10 bg-black/70 p-3 shadow-lg" role="dialog" aria-label="Mobile navigation">
            <div className="grid grid-cols-2 gap-2">
              <Link className="truncate rounded-full border border-pink-500/40 px-3 py-1.5 text-center text-xs hover:bg-pink-500/10" href="/" onClick={() => setOpen(false)}>Home</Link>
              <Link className="truncate rounded-full border border-pink-500/40 px-3 py-1.5 text-center text-xs hover:bg-pink-500/10" href="/discover" onClick={() => setOpen(false)}>Discover</Link>
              <Link className="truncate rounded-full border border-pink-500/40 px-3 py-1.5 text-center text-xs hover:bg-pink-500/10" href="/creator" onClick={() => setOpen(false)}>Become a creator</Link>
              <Link className="truncate rounded-full border border-pink-500/40 px-3 py-1.5 text-center text-xs hover:bg-pink-500/10" href={myProfileHref} onClick={() => setOpen(false)}>My profile</Link>
              {/* ✅ Added About to mobile */}
              <Link className="truncate rounded-full border border-pink-500/40 px-3 py-1.5 text-center text-xs hover:bg-pink-500/10" href="/about" onClick={() => setOpen(false)}>About</Link>

              {myFid > 0n && (
                <button
                  type="button"
                  onClick={() => { onCast(); setOpen(false) }}
                  className="truncate rounded-full border border-violet-400/60 px-3 py-1.5 text-center text-xs hover:bg-violet-400/10"
                >
                  Cast
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
