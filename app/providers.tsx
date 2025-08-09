"use client"

import { SessionProvider } from "next-auth/react"
import { ClientOnly } from "@/components/client-only"
import { ErrorBoundary } from "@/components/error-boundary"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ClientOnly fallback={<div className="min-h-screen bg-white" />}>
        <SessionProvider 
          basePath="/api/auth"
          refetchInterval={5 * 60} // Refetch session every 5 minutes
          refetchOnWindowFocus={true}
        >
          {children}
        </SessionProvider>
      </ClientOnly>
    </ErrorBoundary>
  )
}