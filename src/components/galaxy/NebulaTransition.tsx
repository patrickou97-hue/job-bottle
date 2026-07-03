export function NebulaTransition() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition duration-500 group-hover:opacity-100"
      style={{
        background: "radial-gradient(circle, rgba(226,236,252,0.12), transparent 70%)",
      }}
    />
  );
}
