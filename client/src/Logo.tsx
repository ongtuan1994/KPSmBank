// KPS · MBANKING PORTAL logo, recreated as self-contained inline SVG
// (phone frame + fish + green "KPS" wordmark + orange gear + wordline).

export function KpsLogo({ width = 260 }: { width?: number }) {
  const teeth = Array.from({ length: 8 });
  const gx = 236; // gear centre x
  const gy = 150; // gear centre y
  return (
    <svg width={width} viewBox="0 0 300 250" role="img" aria-label="KPS MBanking Portal" xmlns="http://www.w3.org/2000/svg">
      {/* ---- phone frame (behind) ---- */}
      <g>
        <rect x="70" y="30" width="120" height="196" rx="20" fill="#f3d7a7" stroke="#141210" strokeWidth="5" />
        <rect x="82" y="66" width="96" height="118" fill="#ffffff" />
        <rect x="112" y="46" width="30" height="5" rx="2.5" fill="#141210" />
        <circle cx="130" cy="210" r="7.5" fill="none" stroke="#141210" strokeWidth="3" />
      </g>

      {/* ---- fish (line art), swimming right ---- */}
      <g stroke="#141210" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M96 96 C120 74 176 74 202 96 C176 118 120 118 96 96 Z" />
        <path d="M96 96 L74 84" />
        <path d="M96 96 L74 108" />
        <circle cx="190" cy="90" r="2.8" fill="#141210" stroke="none" />
      </g>

      {/* ---- KPS wordmark ---- */}
      <text
        x="120" y="168" textAnchor="middle"
        fontFamily="Sarabun, system-ui, sans-serif" fontWeight="800" fontSize="74"
        fill="#33b45f" letterSpacing="1"
      >
        KPS
      </text>

      {/* ---- gear (orange) ---- */}
      <g fill="#f7941d">
        {teeth.map((_, i) => (
          <rect key={i} x={gx - 5} y={gy - 30} width="10" height="15" rx="2" transform={`rotate(${i * 45} ${gx} ${gy})`} />
        ))}
        <circle cx={gx} cy={gy} r="20" />
        <circle cx={gx} cy={gy} r="8" fill="#ffffff" />
      </g>

      {/* ---- wordline ---- */}
      <text
        x="150" y="212" textAnchor="middle"
        fontFamily="Sarabun, system-ui, sans-serif" fontWeight="700" fontSize="26"
        fill="#141210" letterSpacing="0.5"
      >
        MBANKING PORTAL
      </text>
    </svg>
  );
}
