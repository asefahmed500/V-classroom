import nodemailer from "nodemailer"

// Create transporter for SMTP2GO
const transporter = nodemailer.createTransport({
  host: "mail.smtp2go.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP2GO_USERNAME || "virtualstudyrooms",
    pass: process.env.SMTP2GO_PASSWORD || process.env.SMTP2GO_API_KEY,
  },
})

// Alternative: Use SMTP2GO API directly
async function sendEmailViaAPI(emailData: {
  to: string
  subject: string
  html: string
  text?: string
}) {
  try {
    const response = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Smtp2go-Api-Key": process.env.SMTP2GO_API_KEY || "",
      },
      body: JSON.stringify({
        api_key: process.env.SMTP2GO_API_KEY,
        to: [emailData.to],
        sender: process.env.FROM_EMAIL || "noreply@virtualstudyrooms.com",
        subject: emailData.subject,
        html_body: emailData.html,
        text_body: emailData.text || emailData.html.replace(/<[^>]*>/g, ""),
      }),
    })

    const result = await response.json()
    
    if (result.data && result.data.succeeded > 0) {
      return { success: true, messageId: result.data.email_id }
    } else {
      throw new Error(result.data?.error || "Failed to send email")
    }
  } catch (error) {
    console.error("SMTP2GO API error:", error)
    throw error
  }
}

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  try {
    // Try SMTP2GO API first (more reliable)
    if (process.env.SMTP2GO_API_KEY) {
      const result = await sendEmailViaAPI({ to, subject, html, text })
      console.log("Email sent via SMTP2GO API:", result.messageId)
      return result
    }

    // Fallback to SMTP
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL || "Virtual Study Rooms <noreply@virtualstudyrooms.com>",
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ""),
      html,
    })

    console.log("Email sent via SMTP:", info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Email error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export function generateInvitationEmail(data: {
  inviterName: string
  roomName: string
  roomSubject: string
  inviteLink: string
  message?: string
}) {
  const { inviterName, roomName, roomSubject, inviteLink, message } = data

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Study Room Invitation</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8fafc;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          font-size: 24px;
        }
        h1 {
          color: #1e293b;
          margin: 0 0 10px 0;
          font-size: 28px;
          font-weight: 700;
        }
        .subtitle {
          color: #64748b;
          font-size: 16px;
          margin: 0;
        }
        .invitation-card {
          background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
          border-radius: 12px;
          padding: 30px;
          margin: 30px 0;
          text-align: center;
        }
        .room-info {
          margin: 20px 0;
        }
        .room-name {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 8px 0;
        }
        .room-subject {
          font-size: 16px;
          color: #3b82f6;
          font-weight: 600;
          margin: 0;
        }
        .message {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 16px;
          margin: 20px 0;
          border-radius: 0 8px 8px 0;
          font-style: italic;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          margin: 20px 0;
          transition: transform 0.2s;
        }
        .cta-button:hover {
          transform: translateY(-2px);
        }
        .features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 20px;
          margin: 30px 0;
        }
        .feature {
          text-align: center;
          padding: 20px;
          background: #f8fafc;
          border-radius: 8px;
        }
        .feature-icon {
          font-size: 24px;
          margin-bottom: 12px;
        }
        .feature h3 {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 4px 0;
          color: #1e293b;
        }
        .feature p {
          font-size: 12px;
          color: #64748b;
          margin: 0;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 14px;
        }
        .link {
          color: #3b82f6;
          text-decoration: none;
        }
        @media (max-width: 600px) {
          body {
            padding: 10px;
          }
          .container {
            padding: 20px;
          }
          .features {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎓</div>
          <h1>You're Invited!</h1>
          <p class="subtitle">Join a collaborative study session</p>
        </div>

        <div class="invitation-card">
          <p><strong>${inviterName}</strong> has invited you to join their study room:</p>
          
          <div class="room-info">
            <h2 class="room-name">${roomName}</h2>
            <p class="room-subject">📚 ${roomSubject}</p>
          </div>

          ${message ? `<div class="message">"${message}"</div>` : ''}

          <a href="${inviteLink}" class="cta-button">
            🚀 Join Study Room
          </a>
        </div>

        <div class="features">
          <div class="feature">
            <div class="feature-icon">📹</div>
            <h3>Video Chat</h3>
            <p>HD video calls with up to 8 participants</p>
          </div>
          <div class="feature">
            <div class="feature-icon">📝</div>
            <h3>Whiteboard</h3>
            <p>Collaborative drawing and note-taking</p>
          </div>
          <div class="feature">
            <div class="feature-icon">💬</div>
            <h3>Real-time Chat</h3>
            <p>Instant messaging with file sharing</p>
          </div>
          <div class="feature">
            <div class="feature-icon">🤖</div>
            <h3>AI Assistant</h3>
            <p>Get help with your studies</p>
          </div>
        </div>

        <div class="footer">
          <p>
            Can't click the button? Copy and paste this link into your browser:<br>
            <a href="${inviteLink}" class="link">${inviteLink}</a>
          </p>
          <p style="margin-top: 20px;">
            This invitation was sent by ${inviterName} through Virtual Study Rooms.<br>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}" class="link">Learn more about Virtual Study Rooms</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
    You're invited to join a study room!
    
    ${inviterName} has invited you to join their study room: ${roomName}
    Subject: ${roomSubject}
    
    ${message ? `Message: "${message}"` : ''}
    
    Join the room: ${inviteLink}
    
    Features:
    - HD Video Chat with up to 8 participants
    - Collaborative Whiteboard
    - Real-time Chat with file sharing
    - AI Study Assistant
    
    Virtual Study Rooms - Collaborative Learning Platform
  `

  return { html, text }
}

export function generateWelcomeEmail(data: {
  userName: string
  loginLink: string
}) {
  const { userName, loginLink } = data

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Virtual Study Rooms</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8fafc;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 48px;
          margin-bottom: 20px;
        }
        h1 {
          color: #1e293b;
          margin: 0 0 10px 0;
          font-size: 28px;
          font-weight: 700;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎓</div>
          <h1>Welcome to Virtual Study Rooms!</h1>
        </div>
        
        <p>Hi ${userName},</p>
        
        <p>Welcome to Virtual Study Rooms! We're excited to have you join our collaborative learning community.</p>
        
        <p>Get started by creating your first study room or joining an existing one:</p>
        
        <div style="text-align: center;">
          <a href="${loginLink}" class="cta-button">
            🚀 Start Studying
          </a>
        </div>
        
        <p>Happy studying!</p>
        <p>The Virtual Study Rooms Team</p>
      </div>
    </body>
    </html>
  `

  const text = `
    Welcome to Virtual Study Rooms!
    
    Hi ${userName},
    
    Welcome to Virtual Study Rooms! We're excited to have you join our collaborative learning community.
    
    Get started: ${loginLink}
    
    Happy studying!
    The Virtual Study Rooms Team
  `

  return { html, text }
}