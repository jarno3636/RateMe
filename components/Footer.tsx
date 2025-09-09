// components/Footer.tsx
import Link from 'next/link'

const CONTRACT_ADDR =
  process.env.NEXT_PUBLIC_PROFILE_REGISTRY ||
  '0x4769667dc49a8E05018729108fD98521F4eBc53A';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 py-8 text-sm text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 md:flex-row">
        <p className="text-xs">© {new Date().getFullYear()} Rate Me</p>
        <nav className="flex flex-wrap items-center gap-4">
          <Link href="/privacy" className="hover:text-slate-200">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-slate-200">
            Terms
          </Link>
          <a
            href={`https://basescan.org/address/${CONTRACT_ADDR}`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-200"
          >
            Contract
          </a>
        </nav>
      </div>
    </footer>
  )
}
