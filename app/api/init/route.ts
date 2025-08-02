import { NextResponse } from "next/server"
import { initializeDatabase } from "@/lib/db-init"

export async function POST() {
  try {
    await initializeDatabase()
    return NextResponse.json({ message: "Database initialized successfully" })
  } catch (error) {
    console.error("Database initialization failed:", error)
    return NextResponse.json(
      { message: "Database initialization failed", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
