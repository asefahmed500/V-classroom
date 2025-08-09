import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const templates = [
      {
        id: 'blank',
        name: 'Blank Canvas',
        preview: '/templates/blank.png',
        elements: []
      },
      {
        id: 'math-grid',
        name: 'Math Grid',
        preview: '/templates/math-grid.png',
        elements: [
          {
            id: 'grid',
            type: 'grid',
            points: [],
            color: '#e0e0e0',
            strokeWidth: 1,
            userId: 'system',
            timestamp: Date.now()
          }
        ]
      },
      {
        id: 'flowchart',
        name: 'Flowchart',
        preview: '/templates/flowchart.png',
        elements: [
          {
            id: 'start',
            type: 'rectangle',
            points: [{ x: 100, y: 50 }, { x: 200, y: 100 }],
            color: '#4CAF50',
            strokeWidth: 2,
            userId: 'system',
            timestamp: Date.now()
          }
        ]
      }
    ]

    return NextResponse.json({
      success: true,
      templates
    })

  } catch (error) {
    console.error('Templates fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}