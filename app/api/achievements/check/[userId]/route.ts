import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { userId } = await params

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify user can only check their own achievements
    if (session.user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Mock achievement checking - in a real app, you'd check user activity and unlock achievements
    const newAchievements = [
      // Example: user just completed their first session
      // {
      //   id: 'first_session',
      //   name: 'First Study Session',
      //   description: 'Complete your first study session',
      //   icon: '🎯',
      //   points: 10,
      //   unlockedAt: new Date().toISOString()
      // }
    ]

    return NextResponse.json({
      success: true,
      newAchievements,
      totalPoints: newAchievements.reduce((sum, achievement) => sum + achievement.points, 0)
    })

  } catch (error) {
    console.error('Check achievements error:', error)
    return NextResponse.json(
      { error: 'Failed to check achievements' },
      { status: 500 }
    )
  }
}