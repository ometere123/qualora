import "server-only"
import { createClient } from "@supabase/supabase-js"

// Service role client  -  NEVER import this in client components or pages
// Use only in Route Handlers and Server Actions that require privileged access
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
