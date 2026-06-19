"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  GitBranch, LayoutGrid, Database, FolderOpen, ShieldCheck,
  Vault, GitMerge, Wrench, List, Activity, Settings, UserCircle, Eye
} from "lucide-react"

const NAV = [
  { label: "Governance Graph", href: "/app/graph",           icon: GitBranch },
  { label: "Command Centre",   href: "/app/command-centre",  icon: LayoutGrid },
  { divider: true },
  { label: "Datasets",         href: "/app/datasets",        icon: Database },
  { label: "Cases",            href: "/app/cases",           icon: FolderOpen },
  { label: "Verdicts",         href: "/app/verdicts",        icon: ShieldCheck },
  { divider: true },
  { label: "Evidence Vault",   href: "/app/evidence",        icon: Vault },
  { label: "Schema Drift Lab", href: "/app/schema-drift",    icon: GitMerge },
  { label: "Fix Review Board", href: "/app/fix-reviews",     icon: Wrench },
  { divider: true },
  { label: "Contract Trace",   href: "/app/contract-trace",  icon: Activity },
  { label: "Admin Review",     href: "/app/admin",           icon: Eye },
  { divider: true },
  { label: "Profile & Wallet", href: "/app/profile",         icon: UserCircle },
  { label: "Settings",         href: "/app/settings",        icon: Settings },
]

export default function MiniNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5 p-3 pt-4 flex-1">
      {NAV.map((item, i) => {
        if ("divider" in item) {
          return <div key={i} className="divider my-2" />
        }
        const Icon = item.icon
        const active = pathname === item.href || pathname.startsWith(item.href + "/")
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mini-nav-item${active ? " active" : ""}`}
          >
            <Icon size={15} style={{ flexShrink: 0 }} />
            <span>{item.label}</span>
          </Link>
        )
      })}

      {/* GenLayer source of truth badge at bottom */}
      <div className="flex-1" />
      <div style={{ padding: "12px 8px 4px" }}>
        <div className="source-of-truth-badge" style={{ fontSize: 9, letterSpacing: "0.06em", justifyContent: "center" }}>
          <span className="status-dot" />
          GENLAYER CONTRACT
        </div>
      </div>
    </nav>
  )
}
