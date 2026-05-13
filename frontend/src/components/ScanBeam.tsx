export function ScanBeam() {
  return (
    <div
      data-motion-id="scan-beam"
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-px overflow-hidden"
    >
      <div
        className="h-full w-1/3 bg-[linear-gradient(90deg,transparent_0%,var(--color-cyan)_40%,var(--color-cyan)_60%,transparent_100%)] animate-[scan-sweep_4s_linear_infinite]"
      />
    </div>
  );
}
