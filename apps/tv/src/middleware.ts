import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function middleware(request: NextRequest) {
  // Versión ultra-simplificada para evitar MIDDLEWARE_INVOCATION_FAILED
  return NextResponse.next()
}

export const config = {
  // Matcher básico sin regex negativas complejas
  matcher: '/:path*',
}