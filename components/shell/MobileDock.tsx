"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  GitBranch, LayoutGrid, FolderOpen, ShieldCheck, Activity
} from "lucide-react"

const DOCK_ITEMS = [
  { label: "Graph",    href: "/app/graph",           icon: GitBranch },
  { label: "Command",  href: "/app/command-centre",  icon: LayoutGrid },
  { label: "Cases",    href: "/app/cases",           icon: FolderOpen },
  { label: "Verdicts", href: "/app/verdicts",        icon: ShieldCheck },
  { label: "Trace",    href: "/app/contract-trace",  icon: Activity },
]

export default function MobileDock() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "var(--audit-white)",
        borderTop: "1px solid var(--schema-line)",
        display: "flex",
        zIndex: 100,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {DOCK_ITEMS.map((item) => {
        const Icon = item.icon
        const active = pathname === item.href || pathname.startsWith(item.href + "/")
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px 4px 8px",
              gap: 4,
              textDecoration: "none",
              color: active ? "var(--consensus-violet)" : "var(--metadata-grey)",
              borderTop: active ? "2px solid var(--consensus-violet)" : "2px solid transparent",
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            <Icon size={20} />
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: "0.02em", fontFamily: "var(--font-source-sans)" }}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
