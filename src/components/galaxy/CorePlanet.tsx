import { SITE_NAME } from '@/lib/constants'

export function CorePlanet() {
  return (
    <div
      className="relative flex flex-col items-center justify-center rounded-full"
      style={{
        width: 'min(34vw, 268px)',
        height: 'min(34vw, 268px)',
        minWidth: 190,
        minHeight: 190,
        background:
          'radial-gradient(circle at 39% 34%, rgba(194,215,244,0.42) 0 5%, rgba(57,82,124,0.38) 20%, rgba(8,18,36,0.97) 62%, rgba(2,5,14,1) 100%)',
        boxShadow:
          '0 0 118px rgba(91,128,178,0.18), 0 0 240px rgba(62,92,139,0.08), inset -26px -32px 72px rgba(0,0,0,0.62), inset 18px 14px 48px rgba(220,234,255,0.06)',
      }}
    >
      <span
        aria-hidden="true"
        className="absolute right-[23%] top-[24%] size-1.5 rounded-full"
        style={{ background: 'rgba(222,197,137,0.64)', boxShadow: '0 0 18px rgba(222,197,137,0.38)' }}
      />
      <span
        aria-hidden="true"
        className="absolute left-[21%] top-[34%] h-8 w-20 -rotate-12 rounded-full blur-lg"
        style={{ background: 'rgba(187,210,239,0.08)' }}
      />
      <span
        className="font-display text-[clamp(1.35rem,2.2vw,2rem)] font-semibold"
        style={{ color: 'rgba(226,235,248,0.94)', textShadow: '0 0 30px rgba(143,176,220,0.22)' }}
      >
        {SITE_NAME}
      </span>
      <span className="mt-3 max-w-[12rem] text-center text-sm leading-6" style={{ color: 'rgba(156,173,199,0.72)' }}>
        把每一次投递，收进你的职业星图。
      </span>
    </div>
  )
}
