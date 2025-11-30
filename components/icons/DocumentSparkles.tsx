export function DocumentSparkles({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Document outline with folded corner */}
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />

      {/* Sparkle 1 - top */}
      <path d="M12 10v1m0 2v1m-1.5-2h3" strokeWidth="1.5" />

      {/* Sparkle 2 - bottom left */}
      <path d="M9 15v0.5m0 1v0.5m-0.75-1h1.5" strokeWidth="1.5" />

      {/* Sparkle 3 - bottom right */}
      <path d="M15 14v0.5m0 1v0.5m-0.75-1h1.5" strokeWidth="1.5" />
    </svg>
  );
}
