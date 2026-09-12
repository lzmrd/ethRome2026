export function ProgressBar({ value }: { value?: number }) {
  const width = Math.max(0, Math.min(100, value ?? 0))
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-line"
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand to-brand-soft transition-[width] duration-700 ease-soft"
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
