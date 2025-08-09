import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(null)
    }
    
    return NextResponse.json(session)
  } catch (error) {
    console.error('Session API error:', error)
    
    // Return null session instead of error to prevent client-side crashes
    return NextResponse.json(null)
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}