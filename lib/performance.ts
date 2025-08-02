"use client"

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number[]> = new Map()

  private constructor() {}

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // Measure function execution time
  public measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now()
    return fn().finally(() => {
      const duration = performance.now() - start
      this.recordMetric(name, duration)
    })
  }

  public measure<T>(name: string, fn: () => T): T {
    const start = performance.now()
    try {
      return fn()
    } finally {
      const duration = performance.now() - start
      this.recordMetric(name, duration)
    }
  }

  private recordMetric(name: string, duration: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    const metrics = this.metrics.get(name)!
    metrics.push(duration)

    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift()
    }
  }

  public getMetrics(name: string): { avg: number; min: number; max: number; count: number } | null {
    const metrics = this.metrics.get(name)
    if (!metrics || metrics.length === 0) return null

    const avg = metrics.reduce((sum, val) => sum + val, 0) / metrics.length
    const min = Math.min(...metrics)
    const max = Math.max(...metrics)

    return { avg, min, max, count: metrics.length }
  }

  public getAllMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {}

    for (const [name] of this.metrics) {
      const metrics = this.getMetrics(name)
      if (metrics) {
        result[name] = metrics
      }
    }

    return result
  }

  // Web Vitals monitoring
  public initWebVitals(): void {
    if (typeof window === "undefined") return

    // Monitor Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1] as any
      this.recordMetric("LCP", lastEntry.startTime)
    }).observe({ entryTypes: ["largest-contentful-paint"] })

    // Monitor First Input Delay (FID)
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        this.recordMetric("FID", entry.processingStart - entry.startTime)
      })
    }).observe({ entryTypes: ["first-input"] })

    // Monitor Cumulative Layout Shift (CLS)
    let clsValue = 0
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      })
      this.recordMetric("CLS", clsValue)
    }).observe({ entryTypes: ["layout-shift"] })
  }

  // Memory usage monitoring
  public getMemoryUsage(): any {
    if (typeof window === "undefined" || !(performance as any).memory) return null

    const memory = (performance as any).memory
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    }
  }

  // Network monitoring
  public monitorNetworkRequests(): void {
    if (typeof window === "undefined") return

    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        if (entry.entryType === "navigation") {
          this.recordMetric("page-load", entry.loadEventEnd - entry.fetchStart)
        } else if (entry.entryType === "resource") {
          this.recordMetric(`resource-${entry.initiatorType}`, entry.duration)
        }
      })
    }).observe({ entryTypes: ["navigation", "resource"] })
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance()

// React hook for performance monitoring
import { useEffect, useRef } from "react"

export function usePerformanceMonitor(componentName: string) {
  const renderStart = useRef<number>(0)

  useEffect(() => {
    renderStart.current = performance.now()
  })

  useEffect(() => {
    const renderTime = performance.now() - renderStart.current
    performanceMonitor.measure(`component-${componentName}`, () => renderTime)
  })

  return {
    measureAsync: (name: string, fn: () => Promise<any>) =>
      performanceMonitor.measureAsync(`${componentName}-${name}`, fn),
    measure: (name: string, fn: () => any) => performanceMonitor.measure(`${componentName}-${name}`, fn),
  }
}

// Error boundary with performance monitoring
export class ErrorBoundaryWithMetrics extends Error {
  constructor(
    message: string,
    public componentStack?: string,
  ) {
    super(message)
    this.name = "ErrorBoundaryWithMetrics"
    performanceMonitor.measure("error-boundary-trigger", () => 1)
  }
}
