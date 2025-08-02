import type { NextRequest } from "next/server"
import jwt from "jsonwebtoken"

export async function verifyToken(request: NextRequest): Promise<string | null> {
  try {
    const token = request.cookies.get("token")?.value

    if (!token) {
      return null
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as { userId: string }
    return decoded.userId
  } catch (error) {
    return null
  }
}
