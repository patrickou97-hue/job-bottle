export function EmptyConstellation() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 420 180"
      className="mx-auto h-36 w-full max-w-[420px]"
    >
      <defs>
        <linearGradient id="emptyLine" x1="36" x2="364" y1="142" y2="32">
          <stop stopColor="#C9C5E4" stopOpacity="0.1" />
          <stop offset="0.5" stopColor="#E7E2FF" stopOpacity="0.5" />
          <stop offset="1" stopColor="#7E7CB5" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <path
        d="M52 132C116 40 242 32 366 74"
        fill="none"
        stroke="#7E7CB5"
        strokeOpacity="0.11"
        strokeWidth="1.2"
      />
      <path
        d="M72 114L139 72L206 96L276 54L348 82"
        fill="none"
        stroke="url(#emptyLine)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
      {[
        [72, 114, 4],
        [139, 72, 5],
        [206, 96, 3.6],
        [276, 54, 4.4],
        [348, 82, 3.8],
      ].map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#E7E2FF" opacity="0.68" />
      ))}
      <circle cx="326" cy="40" r="2" fill="#7F5568" opacity="0.42" />
      <circle cx="112" cy="38" r="1.6" fill="#7E7CB5" opacity="0.54" />
    </svg>
  );
}
