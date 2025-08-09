import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectMongoose } from '@/lib/mongodb'

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    try {
      await connectMongoose()
      const User = require('@/models/User')
      
      // Update user settings in database
      const updateData = {
        updatedAt: new Date()
      }
      
      // Update specific settings
      Object.keys(body).forEach(key => {
        updateData[`settings.${key}`] = body[key]
      })

      await User.findByIdAndUpdate(
        session.user.id,
        updateData,
        { new: true, upsert: true }
      )
    } catch (dbError) {
      console.log('Database error during settings update:', dbError)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating user settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}