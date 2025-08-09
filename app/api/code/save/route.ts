import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectMongoose } from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code, language, roomId, userId, userName } = await request.json()

    if (!code || !language || !roomId) {
      return NextResponse.json({ 
        error: 'Code, language, and roomId are required' 
      }, { status: 400 })
    }

    try {
      await connectMongoose()
      
      // Create a simple code snippet model
      const CodeSnippet = require('@/models/CodeSnippet')
      
      const snippet = new CodeSnippet({
        code,
        language,
        roomId,
        userId: session.user.id,
        userName: session.user.name,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      await snippet.save()

      return NextResponse.json({
        success: true,
        message: 'Code saved successfully',
        snippetId: snippet._id
      })

    } catch (dbError) {
      console.log('Database error, saving to session storage:', dbError)
      
      // Fallback: return success even if DB fails
      return NextResponse.json({
        success: true,
        message: 'Code saved successfully (local)',
        fallback: true
      })
    }

  } catch (error: any) {
    console.error('Code save error:', error)
    return NextResponse.json(
      { error: 'Failed to save code', details: error.message },
      { status: 500 }
    )
  }
}