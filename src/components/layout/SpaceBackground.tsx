type SpaceBackgroundProps = {
  entering?: boolean;
}

export function SpaceBackground({ entering = false }: SpaceBackgroundProps) {
  return (
    <div
      className="space-bg"
      aria-hidden="true"
      style={{
        transform: entering ? "scale(1.08)" : "scale(1)",
        filter: entering ? "brightness(0.62) blur(2px)" : "brightness(1) blur(0)",
        transition: "transform var(--dur-scene) var(--ease-out-cine), filter var(--dur-scene) var(--ease-out-cine)",
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
