// /components/icons/FarcasterIcon.tsx
export function FarcasterIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="currentColor"
      className={className}
    >
      <path d="M352 64H160c-17.7 0-32 14.3-32 32v352h64V256h128v192h64V96c0-17.7-14.3-32-32-32z" />
    </svg>
  );
}
