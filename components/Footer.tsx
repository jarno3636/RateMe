"use client";

import Link from "next/link";
import { Mail } from "lucide-react";

// Inline SVGs for X (Twitter) + Farcaster
function XIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1200 1227"
      fill="currentColor"
      className={className}
    >
      <path d="M714 519L1160 0H1068L667 468 382 0H0l468 727L0 1227h92l423-490 309 490h382L714 519z" />
    </svg>
  );
}

function FarcasterIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      viewBox="0 0 256 256"
      className={className}
    >
      <path d="M128 0C57.3 0 0 57.3 0 128s57.3 128 128 128 128-57.3 128-128S198.7 0 128 0zm0 40a88 88 0 1 1-88 88 88.1 88.1 0 0 1 88-88z" />
      <circle cx="128" cy="128" r="40" fill="black" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-black/80 text-white">
      <div className="mx-auto max-w-5xl px-4 py-10 grid gap-6 md:grid-cols-3">
        {/* Branding */}
        <div>
          <h3 className="text-lg font-semibold">OnlyStars</h3>
          <p className="text-sm text-white/70">
            Creator subscriptions + paid posts + on-chain ratings.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex flex-col gap-2">
          <Link href="/about" className="hover:underline">
            About
          </Link>
          <Link href="/contracts" className="hover:underline">
            Contracts
          </Link>
        </div>

        {/* Contact icons */}
        <div className="flex gap-5 md:justify-end">
          <a
            href="mailto:Onlystarsapp@outlook.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Email"
            className="hover:text-pink-400 transition-colors"
          >
            <Mail className="w-5 h-5" />
          </a>
          <a
            href="https://x.com/onlystars12703?s=21"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X (Twitter)"
            className="hover:text-pink-400 transition-colors"
          >
            <XIcon />
          </a>
          <a
            href="https://farcaster.xyz/onlystars"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Farcaster"
            className="hover:text-pink-400 transition-colors"
          >
            <FarcasterIcon />
          </a>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        © {new Date().getFullYear()} OnlyStars. All rights reserved.
      </div>
    </footer>
  );
}
