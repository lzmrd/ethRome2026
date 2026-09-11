export function ProgressBar({ value }: { value?: number }) {
  const width = Math.max(0, Math.min(100, value ?? 0))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
      <div className="h-full rounded-full bg-amber-500" style={{ width: `${width}%` }} />
    </div>
  )
}
