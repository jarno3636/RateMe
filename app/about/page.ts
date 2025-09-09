// app/about/page.tsx
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-slate-200">
      <h1 className="text-4xl font-bold mb-6">👋 Welcome to Rate Me</h1>
      <p className="mb-4 text-lg">
        Rate Me is a playful experiment on <span className="text-cyan-400">Base</span>. 
        We combine the power of <strong>on-chain profiles</strong> with a splash of fun 
        to let you stake your identity, collect feedback, and explore what your friends 
        really think 👀.
      </p>

      <p className="mb-4">
        Every profile is secured on-chain in our{' '}
        <a
          href="https://basescan.org/address/0x4769667dc49a8E05018729108fD98521F4eBc53A"
          target="_blank"
          rel="noreferrer"
          className="text-cyan-300 underline hover:text-cyan-200"
        >
          Profile Registry contract
        </a>. 
        Handles are unique, verified, and cost just <strong>$0.50 in USDC</strong> to mint.
      </p>

      <p className="mb-4">
        We’re not just a dApp — we’re a social playground where memes meet 
        smart contracts. 🎭
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4">Our Mission 🚀</h2>
      <p>
        To prove that identity doesn’t have to be boring. On Base, your handle is more 
        than a username — it’s your on-chain passport to fun, reputation, and 
        community vibes.
      </p>
    </div>
  );
}
