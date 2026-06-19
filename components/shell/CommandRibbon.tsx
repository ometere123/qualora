"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import {
  Database, AlertTriangle, Clock, Plus, Search, LogOut, User as UserIcon
} from "lucide-react"
import QualoraMark from "@/components/brand/QualoraMark"

interface Props {
  user: User
  onOpenDocket?: (id: string) => void
}

interface RibbonStats {
  openCases: number
  quarantined: number
  pendingConsensus: number
}

export default function CommandRibbon({ user, onOpenDocket: _onOpenDocket }: Props) {
  const router = useRouter()
  const [stats, setStats] = useState<RibbonStats>({ openCases: 0, quarantined: 0, pendingConsensus: 0 })
  const [networkOk, setNetworkOk] = useState(true)
  const [search, setSearch] = useState("")
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function loadStats() {
      const [{ count: openCases }, { count: quarantined }, { count: pendingConsensus }] =
        await Promise.all([
          supabase
            .from("governance_cases")
            .select("*", { count: "exact", head: true })
            .in("status", ["draft", "evidence_attached", "submitted_to_genlayer", "pending_consensus"]),
          supabase
            .from("datasets")
            .select("*", { count: "exact", head: true })
            .eq("governance_status", "quarantined"),
          supabase
            .from("governance_cases")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending_consensus"),
        ])
      setStats({
        openCases: openCases ?? 0,
        quarantined: quarantined ?? 0,
        pendingConsensus: pendingConsensus ?? 0,
      })
    }
    loadStats()

    // Check StudioNet reachability
    fetch("https://studio.genlayer.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "net_version", params: [], id: 1 }),
      signal: AbortSignal.timeout(5000),
    })
      .then(() => setNetworkOk(true))
      .catch(() => setNetworkOk(false))
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <header className="command-ribbon px-5 flex items-center gap-4">
      {/* Logo */}
      <Link href="/app/graph" style={{ flexShrink: 0, lineHeight: 0 }}>
        <QualoraMark variant="dark" size={28} withWordmark={true} />
      </Link>

      <div
        style={{ width: 1, height: 28, background: "var(--schema-line)", flexShrink: 0 }}
      />

      {/* Search */}
      <div className="relative" style={{ maxWidth: 280, flex: 1 }}>
        <Search
          size={14}
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--dormant-slate)",
          }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cases, datasets, hashes…"
          className="form-input"
          style={{
            paddingLeft: 32,
            height: 34,
            fontSize: 13,
            background: "var(--frosted-panel)",
          }}
        />
      </div>

      {/* Stats */}
      <div className="hidden lg:flex items-center gap-3 ml-2">
        <MetricChip
          icon={<AlertTriangle size={12} />}
          value={stats.openCases}
          label="Open cases"
          color="var(--control-ink)"
        />
        <MetricChip
          icon={<Database size={12} />}
          value={stats.quarantined}
          label="Quarantined"
          color={stats.quarantined > 0 ? "var(--quarantine-red)" : "var(--metadata-grey)"}
        />
        <MetricChip
          icon={<Clock size={12} />}
          value={stats.pendingConsensus}
          label="Pending consensus"
          color={stats.pendingConsensus > 0 ? "var(--consensus-violet)" : "var(--metadata-grey)"}
        />
      </div>

      <div className="flex-1" />

      {/* StudioNet pill */}
      <div className="hidden md:flex">
        {networkOk ? (
          <span className="status-pill-online">
            <span className="status-dot" />
            StudioNet
          </span>
        ) : (
          <span
            className="verdict-badge verdict-quarantine"
            style={{ fontSize: 11, letterSpacing: "0.04em" }}
          >
            StudioNet offline
          </span>
        )}
      </div>

      {/* Create case */}
      <Link href="/app/cases/new" className="btn-primary btn-sm" style={{ flexShrink: 0 }}>
        <Plus size={14} />
        New case
      </Link>

      {/* Profile */}
      <div className="relative">
        <button
          onClick={() => setProfileOpen((p) => !p)}
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "var(--governance-navy)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "var(--font-archivo)",
            flexShrink: 0,
            border: "none",
            cursor: "pointer",
          }}
        >
          {user.email?.[0].toUpperCase() ?? <UserIcon size={14} />}
        </button>

        {profileOpen && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 8px)",
              width: 220,
              background: "var(--audit-white)",
              border: "1px solid var(--schema-line)",
              borderRadius: 10,
              boxShadow: "0 8px 24px rgba(10,16,32,0.12)",
              zIndex: 100,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--schema-line)" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--control-ink)" }}>
                {user.email}
              </p>
              <p style={{ fontSize: 11, color: "var(--metadata-grey)", marginTop: 2 }}>
                Data governance operator
              </p>
            </div>
            <Link
              href="/app/profile"
              onClick={() => setProfileOpen(false)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 16px", fontSize: 13, color: "var(--control-ink)",
                fontFamily: "var(--font-source-sans)",
              }}
            >
              <UserIcon size={14} /> Profile &amp; Wallet
            </Link>
            <button
              onClick={handleSignOut}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "10px 16px", fontSize: 13, color: "var(--quarantine-red)",
                fontFamily: "var(--font-source-sans)",
                borderTop: "1px solid var(--schema-line)",
              }}
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

function MetricChip({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode
  value: number
  label: string
  color: string
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 6,
        background: "var(--frosted-panel)",
        border: "1px solid var(--schema-line)",
      }}
    >
      <span style={{ color }}>{icon}</span>
      <span
        style={{
          fontFamily: "var(--font-archivo)",
          fontSize: 14,
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: "var(--font-source-sans)",
          fontSize: 11,
          color: "var(--metadata-grey)",
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </span>
    </div>
  )
}
