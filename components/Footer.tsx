"use client";

import Link from "next/link";
import { Mail } from "lucide-react";

// X (Twitter)
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

// Farcaster arch logo
function FarcasterIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="currentColor"
      className={className}
    >
      <path d="M96 448V160L128 64h256l32 96v288h-64V224H160v224H96z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-black/80 text-white">
      <div className="mx-auto max-w-5xl px-4 py-8 flex flex-col items-center gap-6 md:flex-row md:justify-between">
        {/* Branding + nav links */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <h3 className="text-lg font-semibold">OnlyStars</h3>
          <p className="text-sm text-white/70">
            Creator subscriptions + paid posts + on-chain ratings.
          </p>
          <div className="flex gap-4 text-sm mt-2">
            <Link href="/about" className="hover:underline">
              About
            </Link>
            <Link href="/contracts" className="hover:underline">
              Contracts
            </Link>
          </div>
        </div>

        {/* Contact icons */}
        <div className="flex gap-6">
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
            <XIcon className="w-5 h-5" />
          </a>
          <a
            href="https://farcaster.xyz/onlystars"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Farcaster"
            className="hover:text-pink-400 transition-colors"
          >
            <FarcasterIcon className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* Bottom copyright */}
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        © {new Date().getFullYear()} OnlyStars. All rights reserved.
      </div>
    </footer>
  );
}
