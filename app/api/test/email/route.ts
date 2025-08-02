import { NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const { to, subject, message } = await request.json()

    if (!to) {
      return NextResponse.json({ message: "Email address is required" }, { status: 400 })
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 20px; text-align: center; border-radius: 8px; }
          .content { padding: 20px; background: #f9f9f9; border-radius: 8px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🧪 Test Email</h1>
            <p>Virtual Study Rooms Email Service Test</p>
          </div>
          <div class="content">
            <h2>Hello!</h2>
            <p>${message}</p>
            <p>If you received this email, the email service is working correctly!</p>
            <hr>
            <p><small>This is a test email sent from Virtual Study Rooms at ${new Date().toLocaleString()}</small></p>
          </div>
        </div>
      </body>
      </html>
    `

    const result = await sendEmail({
      to,
      subject,
      html,
      text: `${message}\n\nThis is a test email sent from Virtual Study Rooms at ${new Date().toLocaleString()}`,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Test email sent successfully",
        messageId: result.messageId,
      })
    } else {
      return NextResponse.json(
        { message: "Failed to send email", error: result.error },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Test email error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}