// app/instructions/page.tsx
export default function InstructionsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-slate-200">
      <h1 className="text-4xl font-bold mb-6">📝 How It Works</h1>

      <ol className="list-decimal list-inside space-y-6 text-lg">
        <li>
          <strong>Pick your handle.</strong>  
          Choose a name (letters, numbers, dots, underscores, hyphens) — keep it 🔥.
        </li>
        <li>
          <strong>Pay the toll.</strong>  
          It’s just <span className="text-cyan-400">$0.50 USDC</span> to register.  
          (That’s cheaper than a cup of coffee ☕.)
        </li>
        <li>
          <strong>Lock it in forever.</strong>  
          Once your handle is on-chain, it’s yours.  
          No take-backs, no imposters.
        </li>
        <li>
          <strong>Flex your profile.</strong>  
          Add a display name, avatar, and bio.  
          Make it serious, silly, or a full-on meme.
        </li>
        <li>
          <strong>Enjoy the clout.</strong>  
          Share your profile, collect vibes, and let your friends rate you.  
          Remember: on Base, it’s all for fun. 💫
        </li>
      </ol>

      <div className="mt-12 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-6 text-center">
        <h2 className="text-2xl font-semibold mb-3">⚡ Pro Tips</h2>
        <ul className="space-y-2 text-slate-300">
          <li>✅ Your handle must be lowercase</li>
          <li>✅ You’ll need USDC on Base (get some onchain!)</li>
          <li>✅ Wallet approval happens once, then you’re good</li>
        </ul>
      </div>
    </div>
  );
}
