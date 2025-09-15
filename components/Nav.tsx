"use client"
import Link from "next/link"
import Connect from "./Connect"

export default function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/40 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link className="text-xl font-semibold" href="/">OnlyStars</Link>
        <nav className="flex items-center gap-4">
          <Link className="btn" href="/discover">Discover</Link>
          <Link className="btn" href="/creator">Become a creator</Link>
          <Link className="btn" href="/me">My profile</Link>
          <Connect />
        </nav>
      </div>
    </header>
  )
}
