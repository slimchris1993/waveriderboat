/** The WAVERIDER W-wave mark (same art as public/logo.svg) */
export function LogoMark({ height = 20, className }: { height?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 512 288"
      style={{ height, width: "auto" }}
      className={className}
      aria-hidden
    >
      <path
        d="M 30 168 L 130 48 L 244 228 L 352 46 L 388 168"
        fill="none"
        stroke="#FF7D1F"
        strokeWidth="52"
        strokeLinejoin="round"
      />
      <g fill="#FF7D1F">
        <path d="M 136 14 Q 190 16 198 68 L 166 84 Q 170 42 132 34 Z" />
        <path d="M 358 12 Q 412 14 420 66 L 388 82 Q 392 40 354 32 Z" />
        <polygon points="380,30 508,20 404,70" />
        <polygon points="410,88 494,62 424,118" />
        <polygon points="434,134 480,112 446,160" />
      </g>
    </svg>
  );
}
