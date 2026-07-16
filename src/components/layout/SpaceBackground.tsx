type SpaceBackgroundProps = {
  entering?: boolean;
  variant?: "scene" | "work";
}

export function SpaceBackground({ entering = false, variant = "work" }: SpaceBackgroundProps) {
  if (variant === "work") {
    return <div aria-hidden="true" className="space-bg space-bg--work" />;
  }

  return (
    <div
      className="space-bg"
      aria-hidden="true"
      style={{
        transform: entering ? "scale(1.08)" : "scale(1)",
        opacity: entering ? 0.62 : 1,
        transition: "transform var(--dur-scene) var(--ease-out-cine), opacity var(--dur-scene) var(--ease-out-cine)",
      }}
    >
      <div className="space-bg__image" />
      <div className="space-bg__vignette" />
      <div className="space-bg__stars space-bg__stars--far" />
      <div className="space-bg__stars space-bg__stars--near" />
      <div className="space-bg__noise" />
      <div className="space-bg__meteor" />
    </div>
  );
}
