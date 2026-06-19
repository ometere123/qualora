"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function RealtimeRefresher({ userId }: { userId: string }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel("command-centre-refresh")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "genlayer_governance_verdicts",
        filter: `user_id=eq.${userId}`,
      }, () => { router.refresh() })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "governance_cases",
        filter: `user_id=eq.${userId}`,
      }, () => { router.refresh() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, router])

  return null
}
