"use client"

// Centralized error handling system
export class ErrorHandler {
  private static instance: ErrorHandler
  private errorQueue: Array<{ error: Error; context: string; timestamp: number }> = []
  private maxQueueSize = 100

  private constructor() {
    this.setupGlobalErrorHandlers()
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  private setupGlobalErrorHandlers(): void {
    if (typeof window === "undefined") return

    // Handle unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      this.handleError(new Error(`Unhandled Promise Rejection: ${event.reason}`), "unhandled-promise")
    })

    // Handle JavaScript errors
    window.addEventListener("error", (event) => {
      this.handleError(
        new Error(`JavaScript Error: ${event.message} at ${event.filename}:${event.lineno}`),
        "javascript-error",
      )
    })

    // Handle resource loading errors
    window.addEventListener(
      "error",
      (event) => {
        if (event.target !== window) {
          this.handleError(
            new Error(`Resource Loading Error: ${(event.target as any)?.src || "unknown"}`),
            "resource-error",
          )
        }
      },
      true,
    )
  }

  public handleError(error: Error, context = "unknown"): void {
    const errorEntry = {
      error,
      context,
      timestamp: Date.now(),
    }

    // Add to queue
    this.errorQueue.push(errorEntry)

    // Maintain queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift()
    }

    // Log error
    console.error(`[${context}] Error:`, error)

    // Send to monitoring service in production
    if (process.env.NODE_ENV === "production") {
      this.sendToMonitoringService(errorEntry)
    }

    // Show user-friendly notification
    this.showUserNotification(error, context)
  }

  private async sendToMonitoringService(errorEntry: any): Promise<void> {
    try {
      // Replace with your monitoring service (e.g., Sentry, LogRocket, etc.)
      await fetch("/api/errors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: errorEntry.error.message,
          stack: errorEntry.error.stack,
          context: errorEntry.context,
          timestamp: errorEntry.timestamp,
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      })
    } catch (monitoringError) {
      console.error("Failed to send error to monitoring service:", monitoringError)
    }
  }

  private showUserNotification(error: Error, context: string): void {
    // Only show user notifications for certain types of errors
    const userFacingContexts = ["network-error", "api-error", "socket-error"]

    if (userFacingContexts.includes(context)) {
      // You can integrate with your toast/notification system here
      console.warn("User notification:", this.getUserFriendlyMessage(error, context))
    }
  }

  private getUserFriendlyMessage(error: Error, context: string): string {
    switch (context) {
      case "network-error":
        return "Network connection issue. Please check your internet connection."
      case "api-error":
        return "Server error. Please try again later."
      case "socket-error":
        return "Connection lost. Attempting to reconnect..."
      default:
        return "Something went wrong. Please refresh the page."
    }
  }

  public getErrorHistory(): Array<{ error: Error; context: string; timestamp: number }> {
    return [...this.errorQueue]
  }

  public clearErrorHistory(): void {
    this.errorQueue = []
  }

  // Async error wrapper
  public async wrapAsync<T>(fn: () => Promise<T>, context = "async-operation"): Promise<T | null> {
    try {
      return await fn()
    } catch (error) {
      this.handleError(error as Error, context)
      return null
    }
  }

  // Sync error wrapper
  public wrap<T>(fn: () => T, context = "sync-operation"): T | null {
    try {
      return fn()
    } catch (error) {
      this.handleError(error as Error, context)
      return null
    }
  }
}

export const errorHandler = ErrorHandler.getInstance()

// React hook for error handling
import { useCallback } from "react"

export function useErrorHandler() {
  const handleError = useCallback((error: Error, context = "component") => {
    errorHandler.handleError(error, context)
  }, [])

  const wrapAsync = useCallback((fn: any, context = "component-async") => {
    return errorHandler.wrapAsync(fn, context)
  }, [])

  const wrap = useCallback((fn: any, context = "component-sync") => {
    return errorHandler.wrap(fn, context)
  }, [])

  return { handleError, wrapAsync, wrap }
}
