export function CoinIcon({
  size = 14,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9.25" fill="currentColor" />
      <circle
        cx="12"
        cy="12"
        r="6.35"
        fill="none"
        stroke="rgba(255, 250, 236, 0.85)"
        strokeWidth="1.5"
      />
      <path
        d="M12 8.4v7.2M10.2 10.1h2.6a1.4 1.4 0 0 1 0 2.8h-1.6a1.4 1.4 0 0 0 0 2.8h2.6"
        fill="none"
        stroke="rgba(255, 250, 236, 0.95)"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
