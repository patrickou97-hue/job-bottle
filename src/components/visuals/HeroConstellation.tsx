export function HeroConstellation() {
  return (
    <div className="relative mx-auto aspect-[1.05] w-full max-w-[460px]">
      <svg
        aria-hidden="true"
        viewBox="0 0 460 440"
        className="h-full w-full drop-shadow-[0_28px_70px_rgba(0,0,1,0.55)]"
      >
        <defs>
          <radialGradient id="heroGlow" cx="50%" cy="42%" r="58%">
            <stop offset="0%" stopColor="#E7E2FF" stopOpacity="0.24" />
            <stop offset="48%" stopColor="#7E7CB5" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#000001" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="bottleLine" x1="115" x2="343" y1="108" y2="382">
            <stop stopColor="#E7E2FF" stopOpacity="0.82" />
            <stop offset="0.55" stopColor="#7E7CB5" stopOpacity="0.42" />
            <stop offset="1" stopColor="#7F5568" stopOpacity="0.22" />
          </linearGradient>
          <linearGradient id="orbitLine" x1="28" x2="420" y1="52" y2="344">
            <stop stopColor="#C9C5E4" stopOpacity="0" />
            <stop offset="0.5" stopColor="#7E7CB5" stopOpacity="0.44" />
            <stop offset="1" stopColor="#7F5568" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        <circle cx="230" cy="220" r="196" fill="url(#heroGlow)" />
        <path
          d="M34 255C104 112 272 58 410 126"
          fill="none"
          stroke="url(#orbitLine)"
          strokeDasharray="4 14"
          strokeLinecap="round"
          strokeWidth="1.4"
        />
        <path
          d="M74 338C156 202 286 166 421 229"
          fill="none"
          stroke="#E7E2FF"
          strokeOpacity="0.12"
          strokeLinecap="round"
          strokeWidth="1"
        />
        <path
          d="M88 153L154 109L231 144L301 95L372 143L331 224L251 197L187 257L121 222Z"
          fill="none"
          stroke="#C9C5E4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.48"
          strokeWidth="1.3"
        />
        <path
          d="M154 109L187 257M231 144L251 197M301 95L331 224"
          fill="none"
          stroke="#7E7CB5"
          strokeOpacity="0.2"
          strokeWidth="1"
        />

        <g>
          {[
            [88, 153, 4.5, "#E7E2FF"],
            [154, 109, 5.5, "#7E7CB5"],
            [231, 144, 4, "#C9C5E4"],
            [301, 95, 6, "#E7E2FF"],
            [372, 143, 4.5, "#7F5568"],
            [331, 224, 5, "#7E7CB5"],
            [251, 197, 3.8, "#E7E2FF"],
            [187, 257, 4.2, "#C9C5E4"],
            [121, 222, 3.8, "#E7E2FF"],
          ].map(([cx, cy, r, fill]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={String(fill)} opacity="0.88" />
          ))}
        </g>

        <path
          d="M218 111C218 95 229 86 242 86H268C281 86 292 95 292 111V142C292 155 300 164 313 172C346 192 365 226 365 284C365 352 323 390 255 390C187 390 145 352 145 284C145 226 164 192 197 172C210 164 218 155 218 142V111Z"
          fill="rgba(201, 197, 228, 0.065)"
          stroke="url(#bottleLine)"
          strokeWidth="2.1"
        />
        <path
          d="M232 102H279"
          stroke="#E7E2FF"
          strokeLinecap="round"
          strokeOpacity="0.5"
          strokeWidth="3"
        />
        <path
          d="M187 225C214 204 247 201 280 219C307 233 330 231 349 214"
          fill="none"
          stroke="#E7E2FF"
          strokeOpacity="0.14"
          strokeWidth="1.5"
        />
        <path
          d="M178 298C217 280 261 282 312 309"
          fill="none"
          stroke="#7E7CB5"
          strokeOpacity="0.16"
          strokeWidth="1.2"
        />
        <path
          d="M190 188C178 232 178 307 206 351"
          fill="none"
          stroke="#E7E2FF"
          strokeLinecap="round"
          strokeOpacity="0.18"
          strokeWidth="3"
        />
        <path
          d="M369 147C343 174 319 198 296 226C280 245 267 268 258 299"
          fill="none"
          stroke="#7F5568"
          strokeDasharray="3 12"
          strokeLinecap="round"
          strokeOpacity="0.28"
          strokeWidth="1.4"
        />
        <circle cx="258" cy="299" r="5.5" fill="#7F5568" opacity="0.78" />
        <circle cx="226" cy="327" r="3.5" fill="#7E7CB5" opacity="0.75" />
        <circle cx="291" cy="340" r="3" fill="#E7E2FF" opacity="0.68" />
        <circle cx="320" cy="279" r="2.8" fill="#C9C5E4" opacity="0.74" />
      </svg>
      <div className="absolute inset-x-16 bottom-6 h-6 rounded-full bg-nebula-blue/15 blur-xl" />
    </div>
  );
}
