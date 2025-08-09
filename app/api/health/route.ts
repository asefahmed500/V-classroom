import { NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Test database connection
    await connectMongoose()
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'unknown'
    })
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.NODE_ENV || 'unknown'
    }, { status: 500 })
  }
}