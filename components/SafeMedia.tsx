'use client';

type Props = {
  src: string;
  className?: string;
  rounded?: string; // e.g. "rounded-xl"
};

const IMAGE_EXT = ['.jpg','.jpeg','.png','.gif','.webp','.avif'];
const VIDEO_EXT = ['.mp4','.webm','.mov','.m4v'];

function looksLike(exts: string[], url: string) {
  const u = url.split('?')[0].split('#')[0].toLowerCase();
  return exts.some(e => u.endsWith(e));
}

export default function SafeMedia({ src, className = '', rounded = 'rounded-xl' }: Props) {
  if (looksLike(IMAGE_EXT, src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={`${rounded} w-full h-56 object-cover ${className}`} />;
  }
  if (looksLike(VIDEO_EXT, src)) {
    return (
      <video
        className={`${rounded} w-full h-56 object-cover ${className}`}
        src={src}
        controls
        playsInline
        preload="metadata"
      />
    );
  }
  // Fallback: generic opener, do NOT show the URL string
  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className={`${rounded} block w-full h-56 bg-white/[0.03] grid place-items-center`}
      aria-label="Open content"
      title="Open content"
    >
      <span className="text-xs text-slate-400">Open content</span>
    </a>
  );
}
