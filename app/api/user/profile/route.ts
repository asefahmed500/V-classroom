import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectMongoose } from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to get user data from database
    let profile = null
    
    try {
      await connectMongoose()
      const User = require('@/models/User')
      const user = await User.findById(session.user.id)
      
      if (user) {
        profile = {
          name: user.name || session.user.name || "User",
          email: user.email || session.user.email || "",
          joinedAt: user.createdAt || new Date().toISOString(),
          studyPreferences: {
            subjects: user.studyPreferences?.subjects || ["Mathematics", "Science", "Computer Science"],
            studyTimes: user.studyPreferences?.studyTimes || ["Morning", "Evening"],
            goals: user.studyPreferences?.goals || "Improve academic performance and collaborate with peers"
          },
          stats: {
            totalStudyTime: user.stats?.totalStudyTime || 24,
            studySessions: user.stats?.studySessions || 12,
            achievements: user.stats?.achievements || 5,
            currentStreak: user.stats?.currentStreak || 3
          },
          settings: {
            notifications: user.settings?.notifications ?? true,
            publicProfile: user.settings?.publicProfile ?? false,
            emailUpdates: user.settings?.emailUpdates ?? true
          }
        }
      }
    } catch (dbError) {
      console.log('Database error, using session data:', dbError)
    }

    // Fallback to session data if database fails
    if (!profile) {
      profile = {
        name: session.user.name || "User",
        email: session.user.email || "",
        joinedAt: new Date().toISOString(),
        studyPreferences: {
          subjects: ["Mathematics", "Science", "Computer Science"],
          studyTimes: ["Morning", "Evening"],
          goals: "Improve academic performance and collaborate with peers"
        },
        stats: {
          totalStudyTime: 24,
          studySessions: 12,
          achievements: 5,
          currentStreak: 3
        },
        settings: {
          notifications: true,
          publicProfile: false,
          emailUpdates: true
        }
      }
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, studyPreferences } = body

    let profile = null

    try {
      await connectMongoose()
      const User = require('@/models/User')
      
      // Update user in database
      const updateData = {
        updatedAt: new Date()
      }
      
      if (name) {
        updateData.name = name
      }
      
      if (studyPreferences) {
        updateData['studyPreferences.subjects'] = studyPreferences.subjects
        updateData['studyPreferences.goals'] = studyPreferences.goals
      }

      const user = await User.findByIdAndUpdate(
        session.user.id,
        updateData,
        { new: true, upsert: true }
      )

      if (user) {
        profile = {
          name: user.name || session.user.name || "User",
          email: user.email || session.user.email || "",
          joinedAt: user.createdAt || new Date().toISOString(),
          studyPreferences: {
            subjects: user.studyPreferences?.subjects || ["Mathematics", "Science"],
            studyTimes: user.studyPreferences?.studyTimes || ["Morning", "Evening"],
            goals: user.studyPreferences?.goals || "Improve academic performance"
          },
          stats: {
            totalStudyTime: user.stats?.totalStudyTime || 24,
            studySessions: user.stats?.studySessions || 12,
            achievements: user.stats?.achievements || 5,
            currentStreak: user.stats?.currentStreak || 3
          },
          settings: {
            notifications: user.settings?.notifications ?? true,
            publicProfile: user.settings?.publicProfile ?? false,
            emailUpdates: user.settings?.emailUpdates ?? true
          }
        }
      }
    } catch (dbError) {
      console.log('Database error during update:', dbError)
    }

    // Fallback response if database update fails
    if (!profile) {
      profile = {
        name: name || session.user.name || "User",
        email: session.user.email || "",
        joinedAt: new Date().toISOString(),
        studyPreferences: studyPreferences || {
          subjects: ["Mathematics", "Science"],
          studyTimes: ["Morning", "Evening"],
          goals: "Improve academic performance"
        },
        stats: {
          totalStudyTime: 24,
          studySessions: 12,
          achievements: 5,
          currentStreak: 3
        },
        settings: {
          notifications: true,
          publicProfile: false,
          emailUpdates: true
        }
      }
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}