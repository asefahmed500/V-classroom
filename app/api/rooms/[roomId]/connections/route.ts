import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongodb'
import { handleApiError } from '@/lib/api-helpers'

const Connection = require("@/models/Connection")

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    
    await connectMongoose()

    // Clean up stale connections first
    await Connection.cleanupStaleConnections()

    // Get active connections
    const connections = await Connection.getActiveConnections(roomId)

    const connectionData = connections.map((conn: any) => ({
      connectionId: conn.connectionId,
      userId: conn.userId,
      userName: conn.userName,
      isGuest: conn.isGuest,
      status: conn.status,
      mediaState: conn.mediaState,
      connectedAt: conn.connectedAt,
      lastSeen: conn.lastSeen,
      sessionData: {
        deviceType: conn.sessionData.deviceType,
        browser: conn.sessionData.browser,
        permissions: conn.sessionData.permissions
      }
    }))

    return NextResponse.json({
      success: true,
      connections: connectionData,
      count: connectionData.length
    })

  } catch (error) {
    return handleApiError(error, "Get room connections")
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const body = await request.json()
    const { connectionId, userId } = body

    if (!connectionId && !userId) {
      return NextResponse.json(
        { error: 'Connection ID or User ID is required' },
        { status: 400 }
      )
    }

    await connectMongoose()

    const query: any = { roomId }
    if (connectionId) query.connectionId = connectionId
    if (userId) query.userId = userId

    const connection = await Connection.findOne(query)
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    await connection.disconnect()

    return NextResponse.json({
      success: true,
      message: 'Connection disconnected successfully'
    })

  } catch (error) {
    return handleApiError(error, "Disconnect from room")
  }
}