import { createServerClient } from "@supabase/ssr"
import type { CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

type CookieToSet = {
  name: string
  value: string
  options?: CookieOptions
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getSession reads from the cookie  -  no outbound network call, no timeout risk
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const user = session?.user ?? null
  const path = request.nextUrl.pathname

  // Guard all /app/* routes  -  unauthenticated users go to login
  if (path.startsWith("/app") && !user) {
    const url = new URL("/auth/login", request.url)
    url.searchParams.set("next", path)
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from auth pages
  const isAuthPage =
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/signup") ||
    path.startsWith("/auth/forgot-password")

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/app/graph", request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
