import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json()

    // Log error server-side
    console.error("Client Error Report:", {
      message: errorData.message,
      stack: errorData.stack,
      context: errorData.context,
      timestamp: new Date(errorData.timestamp).toISOString(),
      userAgent: errorData.userAgent,
      url: errorData.url,
    })

    // In production, you would send this to your monitoring service
    // Examples: Sentry, LogRocket, DataDog, etc.

    if (process.env.NODE_ENV === "production") {
      // Example: Send to external monitoring service
      // await sendToSentry(errorData)
      // await sendToLogRocket(errorData)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error handling client error report:", error)
    return NextResponse.json({ error: "Failed to process error report" }, { status: 500 })
  }
}
