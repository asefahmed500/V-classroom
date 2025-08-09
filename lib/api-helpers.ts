import { NextResponse } from 'next/server'
import { connectMongoose } from './mongodb'

export async function withDatabase<T>(
  handler: () => Promise<T>
): Promise<T | NextResponse> {
  try {
    await connectMongoose()
    return await handler()
  } catch (error) {
    console.error('Database operation failed:', error)
    return NextResponse.json(
      { 
        error: 'Database connection failed',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

export function handleApiError(error: unknown, operation: string) {
  console.error(`${operation} error:`, error)
  
  if (error instanceof Error) {
    return NextResponse.json(
      { 
        error: `${operation} failed`,
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
  
  return NextResponse.json(
    { error: `${operation} failed`, message: 'Unknown error occurred' },
    { status: 500 }
  )
}