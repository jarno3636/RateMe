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
    <section id={id} className="card w-full max-w-2xl mx-auto space-y-2 scroll-mt-24">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="text-white/80">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4">
      <header className="card w-full max-w-2xl mx-auto space-y-3">
        <h1 className="text-2xl font-bold">About OnlyStars ✨</h1>
        <p className="text-white/80">
          The easiest way for creators to offer <b>subscriptions</b> and <b>paid posts</b>,
          with transparent <b>on-chain ratings</b>. Built on <b>Base</b>, priced in <b>USDC</b>.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <a href="#how-it-works" className="btn">How it works</a>
          <a href="#for-creators" className="btn-secondary">For creators</a>
          <a href="#for-fans" className="btn-secondary">For fans</a>
          <Link href="/contracts" className="btn-secondary">Contracts</Link>
          <a href="#contact" className="btn-secondary">Contact</a>
        </div>
      </header>

      <Section id="how-it-works" title="How it works">
        <ol className="list-decimal pl-5 space-y-1">
          <li>Create a profile and set a subscription plan.</li>
          <li>Upload posts (image or video). Mark as free, paid, or subscriber-only.</li>
          <li>Fans pay per post or subscribe — all non-custodial in USDC.</li>
          <li>Ratings are on-chain: portable, transparent, Sybil-resistant.</li>
        </ol>
        <p className="pt-2 text-sm opacity-70">
          Tip: Short videos load faster and sell better. Images are cached on first view.
        </p>
      </Section>

      <Section id="for-creators" title="For creators">
        <ul className="list-disc pl-5 space-y-1">
          <li>Own your audience — we never custody your funds.</li>
          <li>Mix & match: free previews, single-post sales, or subscription gates.</li>
          <li>Share to Farcaster with one click.</li>
        </ul>
        <div className="pt-3">
          <Link href="/creator" className="btn">Become a creator</Link>
        </div>
      </Section>

      <Section id="for-fans" title="For fans">
        <ul className="list-disc pl-5 space-y-1">
          <li>Pay exactly for what you want — single posts or all-access subs.</li>
          <li>USDC on Base: fast, low fees, no surprises.</li>
          <li>Ratings help surface high-quality creators.</li>
        </ul>
      </Section>

      <Section id="contact" title="Say hi">
        <div className="flex flex-col gap-2">
          <a className="link" href="mailto:Onlystarsapp@outlook.com">Onlystarsapp@outlook.com</a>
          <a className="link" href="https://x.com/onlystars12703?s=21" target="_blank" rel="noopener noreferrer">X (Twitter)</a>
          <a className="link" href="https://farcaster.xyz/onlystars" target="_blank" rel="noopener noreferrer">Farcaster</a>
        </div>
        <div className="pt-3">
          <a href="#site-footer" className="btn-secondary">Jump to footer</a>
        </div>
      </Section>
    </div>
  );
}
