export default function CreatorGrid() {
  // Replace with real data later
  const mock = [
    { name: 'Aster', bio: 'Music & behind-the-scenes', badge: 'Top' },
    { name: 'Kai', bio: 'Fitness coaching & plans', badge: 'New' },
    { name: 'Nova', bio: 'Art timelapses + PSDs', badge: 'Rising' },
    { name: 'Zed', bio: 'DeFi research threads', badge: 'Top' }
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {mock.map((c) => (
        <article key={c.name} className="card">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{c.name}</h3>
            <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-xs">{c.badge}</span>
          </div>
          <p className="mt-2 text-sm text-slate-300">{c.bio}</p>
          <div className="mt-3 flex gap-2">
            <a href={`/creator/${encodeURIComponent(c.name.toLowerCase())}`} className="btn">View</a>
            <a href={`/creator/${encodeURIComponent(c.name.toLowerCase())}/subscribe`} className="btn-secondary">Subscribe</a>
          </div>
        </article>
      ))}
    </div>
  )
}
