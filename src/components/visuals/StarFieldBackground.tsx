export function StarFieldBackground({ quiet = false }: { quiet?: boolean }) {
  const stars = [
    { left: "12%", top: "8%", size: 1.5, opacity: 0.25 },
    { left: "78%", top: "14%", size: 1, opacity: 0.18 },
    { left: "45%", top: "22%", size: 1, opacity: 0.15 },
    { left: "88%", top: "35%", size: 2, opacity: 0.22 },
    { left: "6%", top: "52%", size: 1, opacity: 0.2 },
    { left: "33%", top: "68%", size: 1.5, opacity: 0.18 },
    { left: "72%", top: "58%", size: 1, opacity: 0.15 },
    { left: "55%", top: "82%", size: 2, opacity: 0.25 },
    { left: "18%", top: "90%", size: 1, opacity: 0.2 },
    { left: "92%", top: "75%", size: 1.5, opacity: 0.18 },
  ];

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(126, 124, 181, 0.06), transparent)",
        }}
      />
      {stars.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            opacity: quiet ? star.opacity * 0.5 : star.opacity,
          }}
        />
      ))}
    </div>
  );
}
