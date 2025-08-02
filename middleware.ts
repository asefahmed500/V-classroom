import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Handle Socket.io requests
  if (request.nextUrl.pathname.startsWith("/socket.io")) {
    return NextResponse.rewrite(new URL("/api/socketio", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/socket.io/:path*"],
}
