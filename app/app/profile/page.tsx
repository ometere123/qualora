import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import Link from "next/link"

export const metadata = { title: "Profile" }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const [{ data: profile }, { data: wallet }, { data: recoveryAudit }] = await Promise.all([
    admin.from("profiles").select("*").eq("user_id", user!.id).single(),
    admin.from("wallets").select("id, address, created_at").eq("user_id", user!.id).single(),
    admin.from("recovery_audit_logs").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(5),
  ])

  return (
    <div style={{ padding: "28px 32px", maxWidth: 760 }}>
      <h1 className="text-page-title mb-6" style={{ color: "var(--control-ink)" }}>Profile</h1>

      {/* Identity */}
      <div className="audit-panel" style={{ padding: 24, marginBottom: 20 }}>
        <p className="text-badge-label mb-4" style={{ color: "var(--metadata-grey)" }}>IDENTITY</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Display name" value={profile?.display_name ?? " - "} />
          <Field label="Email" value={user!.email ?? " - "} />
          <Field label="Role" value={profile?.role ?? " - "} />
          <Field label="Member since" value={new Date(user!.created_at).toLocaleDateString()} />
          <Field label="Onboarding" value={profile?.onboarding_completed ? "Completed" : "Incomplete"} />
        </div>
        <div className="flex gap-3 mt-5">
          <Link href="/app/settings" className="btn-secondary btn-sm">Edit profile</Link>
        </div>
      </div>

      {/* Embedded wallet */}
      <div className="audit-panel genlayer-border" style={{ padding: 24, marginBottom: 20 }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-badge-label" style={{ color: "var(--consensus-violet)" }}>EMBEDDED WALLET</p>
          <div className="source-of-truth-badge">
            <span className="status-dot" />
            StudioNet signing key
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <p className="text-meta mb-1">Wallet address</p>
          <span className="hash-block">{wallet?.address ?? "No wallet found"}</span>
        </div>
        {wallet && (
          <div style={{ marginBottom: 16 }}>
            <p className="text-meta mb-1">Created</p>
            <p style={{ fontSize: 13, color: "var(--control-ink)" }}>{new Date(wallet.created_at).toLocaleDateString()}</p>
          </div>
        )}
        <div
          style={{
            background: "rgba(124,58,237,0.06)",
            border: "1px solid rgba(124,58,237,0.18)",
            borderRadius: 8,
            padding: "12px 14px",
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 13, color: "var(--metadata-grey)", lineHeight: 1.7 }}>
            Your wallet is a managed embedded wallet  -  encrypted server-side and permanently linked to your account.
            The private key never leaves the server. Resetting your password does not affect your wallet.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/auth/reset-password" className="btn-secondary btn-sm">
            Change password
          </Link>
        </div>
      </div>

      {/* Recovery audit log */}
      {recoveryAudit && recoveryAudit.length > 0 && (
        <div className="audit-panel" style={{ padding: 24 }}>
          <p className="text-badge-label mb-4" style={{ color: "var(--metadata-grey)" }}>RECOVERY AUDIT LOG</p>
          <div className="flex flex-col gap-2">
            {recoveryAudit.map((log: any) => (
              <div key={log.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between" }}>
                <p style={{ fontSize: 13, color: "var(--control-ink)" }}>
                  {log.action?.replace(/_/g, " ")}
                </p>
                <p style={{ fontSize: 11, fontFamily: "var(--font-roboto-mono)", color: "var(--metadata-grey)" }}>
                  {new Date(log.created_at).toUTCString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-meta mb-1">{label}</p>
      <p style={{ fontSize: 13, color: "var(--control-ink)" }}>{value}</p>
    </div>
  )
}
