'use client';

export default function AccessBadge({
  kind,              // "purchased" | "subscription"
  until,             // ms timestamp (optional)
}: {
  kind: 'purchased' | 'subscription';
  until?: number | null;
}) {
  const label =
    kind === 'purchased'
      ? 'Purchased'
      : 'Subscribed';

  const date =
    until && until > 0
      ? new Date(until).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      {label}
      {date ? <span className="opacity-80">• until {date}</span> : null}
    </span>
  );
}
