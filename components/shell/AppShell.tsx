"use client"

import { useState } from "react"
import type { User } from "@supabase/supabase-js"
import CommandRibbon from "./CommandRibbon"
import MiniNav from "./MiniNav"
import CaseDocketDrawer from "./CaseDocketDrawer"

interface Props {
  user: User
  profile: { onboarding_completed: boolean; display_name: string | null } | null
  children: React.ReactNode
}

export default function AppShell({ user, profile, children }: Props) {
  const [docketCaseId, setDocketCaseId] = useState<string | null>(null)

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--ledger-mist)" }}>
      {/* Command Ribbon */}
      <CommandRibbon user={user} onOpenDocket={(id) => setDocketCaseId(id)} />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mini Nav */}
        <aside
          style={{
            width: 220,
            background: "var(--audit-white)",
            borderRight: "1px solid var(--schema-line)",
            flexShrink: 0,
          }}
          className="hidden md:flex flex-col"
        >
          <MiniNav />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Case Docket Drawer */}
      {docketCaseId && (
        <CaseDocketDrawer
          caseId={docketCaseId}
          onClose={() => setDocketCaseId(null)}
        />
      )}
    </div>
  )
}
