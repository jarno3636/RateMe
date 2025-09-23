"use client";

import Link from "next/link";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="card w-full max-w-2xl mx-auto space-y-3 scroll-mt-24 border-white/10 bg-black/40"
    >
      <h2 className="text-xl font-semibold">
        <span className="bg-gradient-to-r from-pink-400 to-fuchsia-400 bg-clip-text text-transparent">
          {title}
        </span>
      </h2>
      <div className="text-white/80">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4">
      {/* Hero */}
      <header className="w-full max-w-2xl mx-auto rounded-2xl border border-pink-500/20 bg-gradient-to-b from-pink-500/10 to-fuchsia-500/5 p-6 shadow-[0_0_40px_-20px_rgba(255,78,205,0.6)] space-y-3">
        <div className="inline-flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-pink-400" />
          <span className="text-xs tracking-wide text-pink-300/90">ON BASE • USDC</span>
        </div>

        <h1 className="text-3xl font-extrabold leading-tight">
          <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            OnlyStars
          </span>{" "}
          <span className="opacity-90">makes creator monetization easy.</span>
        </h1>

        <p className="text-white/80">
          Offer <b className="text-pink-300">subscriptions</b>, sell{" "}
          <b className="text-pink-300">paid posts</b>, and build trust with{" "}
          <b className="text-pink-300">on-chain ratings</b>. Fast, low-fee payments in{" "}
          <b className="text-pink-300">USDC</b> on <b className="text-pink-300">Base</b>.
        </p>

        <div className="flex flex-wrap gap-2 pt-2">
          <a href="#how-it-works" className="btn">
            How it works
          </a>
          <a href="#for-creators" className="btn-secondary hover:border-pink-400 hover:text-pink-300">
            For creators
          </a>
          <a href="#for-fans" className="btn-secondary hover:border-pink-400 hover:text-pink-300">
            For fans
          </a>
          <Link href="/contracts" className="btn-secondary hover:border-pink-400 hover:text-pink-300">
            Contracts
          </Link>
          <a href="#contact" className="btn-secondary hover:border-pink-400 hover:text-pink-300">
            Contact
          </a>
        </div>
      </header>

      {/* How it works */}
      <Section id="how-it-works" title="How it works">
        <ol className="list-decimal pl-5 space-y-2 marker:text-pink-400">
          <li>Create your profile and set a subscription plan.</li>
          <li>Upload posts (image/video). Mark as free, paid, or subscriber-only.</li>
          <li>Fans pay per post or subscribe — non-custodial USDC on Base.</li>
          <li>Ratings are on-chain: portable, transparent, Sybil-resistant.</li>
        </ol>
        <p className="pt-2 text-xs text-white/60">
          Pro tip: short clips and crisp images convert best. ✨
        </p>
      </Section>

      {/* For creators */}
      <Section id="for-creators" title="For creators">
        <ul className="grid gap-2 sm:grid-cols-2">
          <li className="rounded-lg border border-white/10 bg-black/30 p-3">
            <span className="text-pink-300">Own your audience.</span> We never custody funds.
          </li>
          <li className="rounded-lg border border-white/10 bg-black/30 p-3">
            Mix free previews, single-post sales, or subs.
          </li>
          <li className="rounded-lg border border-white/10 bg-black/30 p-3">
            One-click share to Farcaster.
          </li>
          <li className="rounded-lg border border-white/10 bg-black/30 p-3">
            Transparent on-chain ratings to surface quality.
          </li>
        </ul>
        <div className="pt-4">
          <Link href="/creator" className="btn hover:border-pink-400 hover:text-pink-300">
            Become a creator
          </Link>
        </div>
      </Section>

      {/* For fans */}
      <Section id="for-fans" title="For fans">
        <ul className="grid gap-2 sm:grid-cols-2">
          <li className="rounded-lg border border-white/10 bg-black/30 p-3">
            Pay exactly what you want: single posts or all-access.
          </li>
          <li className="rounded-lg border border-white/10 bg-black/30 p-3">
            USDC on Base = fast, low fees, no surprises.
          </li>
          <li className="rounded-lg border border-white/10 bg-black/30 p-3">
            On-chain ratings help you find the best creators.
          </li>
          <li className="rounded-lg border border-white/10 bg-black/30 p-3">
            Keep your content portable across web3 apps.
          </li>
        </ul>
      </Section>

      {/* Contact */}
      <Section id="contact" title="Say hi">
        <div className="flex flex-col gap-2">
          <a className="link text-pink-300 hover:text-pink-200" href="mailto:Onlystarsapp@outlook.com">
            Onlystarsapp@outlook.com
          </a>
          <a
            className="link text-pink-300 hover:text-pink-200"
            href="https://x.com/onlystars12703?s=21"
            target="_blank"
            rel="noopener noreferrer"
          >
            X (Twitter)
          </a>
          <a
            className="link text-pink-300 hover:text-pink-200"
            href="https://farcaster.xyz/onlystars"
            target="_blank"
            rel="noopener noreferrer"
          >
            Farcaster
          </a>
        </div>
        <div className="pt-3">
          <a href="#site-footer" className="btn-secondary hover:border-pink-400 hover:text-pink-300">
            Jump to footer
          </a>
        </div>
      </Section>
    </div>
  );
}
