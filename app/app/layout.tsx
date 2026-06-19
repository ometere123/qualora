import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AppShell from "@/components/shell/AppShell"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, display_name, role")
    .eq("user_id", user.id)
    .single()

  const isAdmin = profile?.role === "admin"

  return <AppShell user={user} profile={profile} isAdmin={isAdmin}>{children}</AppShell>
}
