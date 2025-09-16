// /components/Logo.tsx
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ec4899" />     {/* pink-500 */}
          <stop offset="1" stopColor="#a21caf" />     {/* fuchsia-700 */}
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="15" stroke="url(#g)" strokeWidth="2" />
      <path
        d="M16 7l2.4 5.2L24 13l-4 3.6.9 5.4L16 19.6 11.1 22 12 16.6 8 13l5.6-.8L16 7z"
        fill="url(#g)"
      />
    </svg>
  )
}
