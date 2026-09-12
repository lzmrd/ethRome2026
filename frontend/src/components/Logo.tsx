import { useId } from 'react'

/**
 * Il marchio: tre segmenti in diagonale che si leggono insieme come una
 * formica di profilo e come una progressione che sale. Nessun testo dentro
 * l'icona, cosi' regge anche a 16px nella scheda del browser.
 */
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  const id = useId()

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Formica"
      className={className}
    >
      <defs>
        <linearGradient id={id} x1="5" y1="27" x2="27" y2="5" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#fcd34d" />
        </linearGradient>
      </defs>

      {/* addome, torace, capo */}
      <g fill={`url(#${id})`}>
        <circle cx="9.5" cy="23" r="5.2" />
        <circle cx="17.2" cy="16.4" r="3.8" />
        <circle cx="23.4" cy="10.8" r="3" />
      </g>

      {/* antenne */}
      <g stroke={`url(#${id})`} strokeWidth="1.7" strokeLinecap="round" fill="none">
        <path d="M25.2 8.5 28.4 5" />
        <path d="M22.1 7.9 22.9 3.4" />
      </g>
    </svg>
  )
}
