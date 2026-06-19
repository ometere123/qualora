"use client"

interface Props {
  /** "light" = white/lavender Q on dark bg (auth pages, dark headers)
   *  "dark"  = violet Q on light bg (app ribbon, light panels) */
  variant?: "light" | "dark"
  size?: number
  withWordmark?: boolean
}

export default function QualoraMark({ variant = "light", size = 32, withWordmark = true }: Props) {
  const isLight = variant === "light"

  // Icon colours
  const bgFill   = isLight ? "url(#ql-bg)" : "none"
  const bgStroke = isLight ? "rgba(124,58,237,0.5)" : "none"
  const ringStroke = isLight ? "rgba(124,58,237,0.35)" : "rgba(109,40,217,0.25)"
  const lineStroke = isLight ? "rgba(167,139,250,0.2)" : "rgba(109,40,217,0.15)"
  const dotFill    = isLight ? "url(#ql-node)" : "url(#ql-node-dark)"
  const qStroke    = isLight ? "url(#ql-q)" : "url(#ql-q-dark)"
  const wordmarkColor = isLight ? "#FFFFFF" : "var(--governance-navy, #0f172a)"
  const subnameColor  = isLight ? "rgba(167,139,250,0.85)" : "var(--metadata-grey, #64748b)"

  const id = isLight ? "ql-l" : "ql-d"

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: size * 0.35, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Qualora"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2e0d6e"/>
            <stop offset="100%" stopColor="#4c1d95"/>
          </linearGradient>
          <linearGradient id={`${id}-q`} x1="0.2" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor={isLight ? "#ddd6fe" : "#7c3aed"}/>
            <stop offset="100%" stopColor={isLight ? "#ffffff" : "#4c1d95"}/>
          </linearGradient>
          <linearGradient id={`${id}-node`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee"/>
            <stop offset="100%" stopColor="#06b6d4"/>
          </linearGradient>
          <linearGradient id={`${id}-node-dark`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0891b2"/>
            <stop offset="100%" stopColor="#0e7490"/>
          </linearGradient>
        </defs>

        {/* Background square (only on light variant) */}
        {isLight && (
          <>
            <rect width="200" height="200" rx="44" fill={`url(#${id}-bg)`}/>
            <rect width="200" height="200" rx="44" fill="none" stroke="#7c3aed" strokeWidth="1.2" opacity="0.5"/>
          </>
        )}

        {/* Hex ring */}
        <polygon
          points="182,100 141,171.1 59,171.1 18,100 59,28.9 141,28.9"
          fill="none" stroke={ringStroke} strokeWidth="1"
        />

        {/* Spoke lines */}
        {[[182,100],[141,171],[59,171],[18,100],[59,29],[141,29]].map(([x,y], i) => (
          <line key={i} x1={x} y1={y} x2="100" y2="100"
            stroke={lineStroke} strokeWidth="0.5"/>
        ))}

        {/* Validator nodes */}
        {[[182,100],[141,171],[59,171],[18,100],[59,29],[141,29]].map(([cx,cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="4.5" fill={`url(#${id}-node)`}/>
        ))}

        {/* Q arc */}
        <path
          d="M 118 131.4 A 42 42 0 1 0 76 131.4"
          fill="none"
          stroke={`url(#${id}-q)`}
          strokeWidth="13"
          strokeLinecap="round"
        />

        {/* Q tail */}
        <line
          x1="118" y1="131.4" x2="148" y2="163"
          stroke={`url(#${id}-q)`}
          strokeWidth="13"
          strokeLinecap="round"
        />
      </svg>

      {withWordmark && (
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{
            fontFamily: "var(--font-archivo, system-ui)",
            fontSize: size * 0.56,
            fontWeight: 700,
            color: wordmarkColor,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}>
            Qualora
          </span>
          <span style={{
            fontFamily: "var(--font-source-sans, system-ui)",
            fontSize: size * 0.28,
            fontWeight: 600,
            color: subnameColor,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginTop: 2,
          }}>
            Data Quality Oracle
          </span>
        </span>
      )}
    </span>
  )
}
