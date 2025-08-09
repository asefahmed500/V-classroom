import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { ErrorBoundary } from "@/components/error-boundary"
import { Toaster } from "@/components/toaster"
import { Providers } from "./providers"

export const metadata: Metadata = {
  title: "Virtual Study Rooms - AI-Powered Collaborative Learning",
  description: "Transform isolated studying into engaging collaborative learning experiences for high school students",
  keywords: ["study rooms", "collaboration", "education", "AI", "video chat", "whiteboard"],
  authors: [{ name: "PANDA Hacks 2025 Team" }],
  generator: "v0.dev",
  openGraph: {
    title: "Virtual Study Rooms",
    description: "AI-Powered Collaborative Learning Platform",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta httpEquiv="Permissions-Policy" content="camera=*, microphone=*, display-capture=*" />
      </head>
      <body className={GeistSans.className}>
        <Providers>
          <ErrorBoundary>
            {children}
            <Toaster />
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  )
}
