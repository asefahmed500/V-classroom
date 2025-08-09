import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { userId, event, data, properties } = await request.json()

    if (!event) {
      return NextResponse.json(
        { error: 'Event name is required' },
        { status: 400 }
      )
    }

    // Use properties or data, whichever is provided
    const eventData = properties || data || {}

    try {
      const { db } = await connectToDatabase()

      // Create analytics event
      const analyticsEvent = {
        userId: userId || session?.user?.id || 'anonymous',
        userName: session?.user?.name || 'Anonymous',
        event,
        data: eventData,
        timestamp: new Date(),
        userAgent: request.headers.get('user-agent') || 'Unknown',
        ip: request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown',
        sessionId: session?.user?.id ? `auth_${session.user.id}` : `anon_${Date.now()}`
      }

      // Store in analytics collection
      await db.collection('analytics_events').insertOne(analyticsEvent)

      // Update user stats if applicable
      if (session?.user?.id) {
        const updateData: any = {}
        
        switch (event) {
          case 'room_joined':
            updateData['stats.roomsJoined'] = 1
            break
          case 'file_uploaded':
            updateData['stats.filesUploaded'] = 1
            break
          case 'ai_assistant_query':
            updateData['stats.aiQueries'] = 1
            break
          case 'whiteboard_used':
            updateData['stats.whiteboardSessions'] = 1
            break
          case 'screen_share_started':
            updateData['stats.screenShares'] = 1
            break
        }

        if (Object.keys(updateData).length > 0) {
          await db.collection('users').updateOne(
            { _id: session.user.id },
            { 
              $inc: updateData,
              $set: { lastActivity: new Date() }
            },
            { upsert: true }
          )
        }
      }

      console.log('Analytics event tracked:', { event, userId: analyticsEvent.userId, data: eventData })

      return NextResponse.json({ 
        success: true,
        message: 'Event tracked successfully'
      })
    } catch (dbError) {
      // If database fails, still log to console
      console.log('Analytics event (DB failed):', { event, properties: eventData, timestamp: new Date() })
      
      return NextResponse.json({
        success: true,
        message: 'Event logged successfully'
      })
    }

  } catch (error) {
    console.error('Analytics tracking error:', error)
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Analytics endpoint is active',
    timestamp: new Date().toISOString()
  })
}