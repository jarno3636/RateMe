// components/BioBlock.tsx
import React from 'react';

type Props = {
  text?: string | null;
  maxChars?: number;        // how many chars to show before collapsing
  className?: string;       // extra classes for the container
};

export default function BioBlock({ text, maxChars = 320, className = '' }: Props) {
  const raw = (text || '').trim();
  if (!raw) return null;

  if (raw.length <= maxChars) {
    return (
      <p className={`whitespace-pre-wrap leading-relaxed text-slate-300 ${className}`}>
        {raw}
      </p>
    );
  }

  return (
    <div className={`leading-relaxed text-slate-300 ${className}`}>
      <details className="group">
        <summary className="cursor-pointer list-none">
          <span className="whitespace-pre-wrap">{raw.slice(0, maxChars)}…</span>
          <span className="ml-1 text-cyan-300 group-open:hidden">Read more</span>
        </summary>
        <div className="mt-2 whitespace-pre-wrap">
          {raw}
          <div className="mt-1">
            <span className="text-cyan-300">Read less</span>
          </div>
        </div>
      </details>
    </div>
  );
}
