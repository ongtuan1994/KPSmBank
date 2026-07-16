// KPS · MBANKING PORTAL logo — self-contained inline SVG.
// Clean horizontal lockup on the app theme: a green app-icon emblem (fish =
// แพปลา, with a small orange gear accent) + green "KPS" wordmark and a
// clearly-separated "MBANKING PORTAL" tagline (no overlap with the emblem).

export function KpsLogo({ width = 260 }: { width?: number }) {
  const teeth = Array.from({ length: 6 });
  const gx = 90; // gear-badge centre (within the emblem group)
  const gy = 90;
  return (
    <svg width={width} viewBox="0 0 324 124" role="img" aria-label="KPS MBanking Portal" xmlns="http://www.w3.org/2000/svg">
      {/* ---- app-icon emblem ---- */}
      <g>
        <rect x="8" y="14" width="96" height="96" rx="24" fill="#2f5f3c" />
        <rect x="8" y="14" width="96" height="96" rx="24" fill="#ffffff" opacity="0.06" />

        {/* fish (แพปลา), cream, swimming right */}
        <g fill="#f6f3ec">
          <path d="M30 60 C42 46 68 46 82 60 C68 74 42 74 30 60 Z" />
          <path d="M30 60 L16 51 L21 60 L16 69 Z" />
        </g>
        <circle cx="72" cy="55" r="2.6" fill="#2f5f3c" />

        {/* gear accent badge (banking / mobile), orange */}
        <g fill="#f7941d">
          {teeth.map((_, i) => (
            <rect key={i} x={gx - 3} y={gy - 15} width="6" height="8" rx="1.5" transform={`rotate(${i * 60} ${gx} ${gy})`} />
          ))}
          <circle cx={gx} cy={gy} r="10.5" />
          <circle cx={gx} cy={gy} r="4" fill="#fffdf8" />
        </g>
      </g>

      {/* ---- KPS wordmark ---- */}
      <text
        x="124" y="70"
        fontFamily="Sarabun, system-ui, sans-serif" fontWeight="800" fontSize="56"
        fill="#3f7d4e" letterSpacing="1.5"
      >
        KPS
      </text>

      {/* ---- tagline (clearly below the wordmark) ---- */}
      <text
        x="126" y="94"
        fontFamily="Sarabun, system-ui, sans-serif" fontWeight="700" fontSize="14"
        fill="#8a8072" letterSpacing="3.5"
      >
        MBANKING PORTAL
      </text>
    </svg>
  );
}
