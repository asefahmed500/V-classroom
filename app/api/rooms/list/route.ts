import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectMongoose } from '@/lib/mongodb'
import { handleApiError } from '@/lib/api-helpers'

const Room = require("@/models/Room")
const User = require("@/models/User")

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')
    const session = await getServerSession(authOptions)

    await connectMongoose()

    let query: any = { isActive: true }
    
    switch (type) {
      case 'created':
        if (!session?.user?.id) {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          )
        }
        query.createdBy = session.user.id
        break
      
      case 'public':
        query.privacy = 'public'
        break
      
      case 'joined':
        if (!session?.user?.id) {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          )
        }
        query['participants.userId'] = session.user.id
        break
    }

    const rooms = await Room.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    // Get unique creator IDs
    const creatorIds = [...new Set(rooms.map((room: any) => room.createdBy).filter(Boolean))]
    
    // Fetch creator information
    const creators = await User.find({ _id: { $in: creatorIds } })
      .select('_id name email')
      .lean()
    
    const creatorMap = new Map(creators.map(creator => [creator._id.toString(), creator]))

    const roomsData = rooms.map((room: any) => {
      const creator = creatorMap.get(room.createdBy)
      return {
        _id: room._id,
        roomId: room._id.toString(),
        name: room.name,
        subject: room.subject,
        description: room.description,
        roomCode: room.roomCode,
        createdBy: room.createdBy,
        creatorName: creator?.name,
        creatorEmail: creator?.email,
        maxParticipants: room.maxParticipants,
        participantCount: room.participants?.length || 0,
        participants: room.participants || [],
        privacy: room.privacy,
        isActive: room.isActive,
        createdAt: room.createdAt,
        settings: room.settings,
        // Include full room object for detailed views
        ...room
      }
    })

    return NextResponse.json({
      success: true,
      rooms: roomsData,
      count: roomsData.length
    })

  } catch (error) {
    return handleApiError(error, "List rooms")
  }
}