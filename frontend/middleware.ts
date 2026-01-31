import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Check for token in localStorage (via cookie fallback for SSR)
  // Note: En production, utiliser HTTPOnly cookies serait plus sécurisé
  const isLoginPage = request.nextUrl.pathname === "/login"

  // Pour l'instant, on laisse passer toutes les requêtes
  // La vraie protection se fait côté client avec le store Zustand
  // et les redirects dans les composants
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)",
  ],
}
