#!/usr/bin/env node

/**
 * Fix API Route Parameter Types for Next.js 15
 * Updates all API routes to use Promise<{ params }> syntax
 */

const fs = require('fs')
const path = require('path')

console.log('🔧 Fixing API Route Parameter Types...')

const apiRoutes = [
  'app/api/rooms/[id]/whiteboard/route.ts',
  'app/api/rooms/[id]/route.ts', 
  'app/api/rooms/[id]/participants/route.ts',
  'app/api/rooms/[id]/notes/[noteId]/route.ts',
  'app/api/rooms/[id]/notes/route.ts',
  'app/api/rooms/[id]/leave/route.ts',
  'app/api/rooms/join/[code]/route.ts'
]

const fixes = [
  // Single id parameter
  {
    from: /{ params }: { params: { id: string } }/g,
    to: '{ params }: { params: Promise<{ id: string }> }'
  },
  // id and noteId parameters
  {
    from: /{ params }: { params: { id: string; noteId: string } }/g,
    to: '{ params }: { params: Promise<{ id: string; noteId: string }> }'
  },
  // id and fileId parameters
  {
    from: /{ params }: { params: { id: string; fileId: string } }/g,
    to: '{ params }: { params: Promise<{ id: string; fileId: string }> }'
  },
  // code parameter
  {
    from: /{ params }: { params: { code: string } }/g,
    to: '{ params }: { params: Promise<{ code: string }> }'
  }
]

const paramUsageFixes = [
  // Direct params.id usage
  {
    from: /const roomId = params\.id/g,
    to: 'const { id: roomId } = await params'
  },
  // Direct params.noteId usage
  {
    from: /const { noteId } = params/g,
    to: 'const { noteId } = await params'
  },
  // Direct params.fileId usage  
  {
    from: /const { fileId } = params/g,
    to: 'const { fileId } = await params'
  },
  // Direct params.code usage
  {
    from: /const roomCode = params\.code/g,
    to: 'const { code: roomCode } = await params'
  },
  // Other patterns
  {
    from: /params\.id/g,
    to: '(await params).id'
  }
]

// Fix each file
apiRoutes.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath)
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`)
    return
  }
  
  let content = fs.readFileSync(fullPath, 'utf8')
  let modified = false
  
  // Apply type fixes
  fixes.forEach(fix => {
    if (fix.from.test(content)) {
      content = content.replace(fix.from, fix.to)
      modified = true
    }
  })
  
  // Apply parameter usage fixes
  paramUsageFixes.forEach(fix => {
    if (fix.from.test(content)) {
      content = content.replace(fix.from, fix.to)
      modified = true
    }
  })
  
  if (modified) {
    fs.writeFileSync(fullPath, content)
    console.log(`✅ Fixed: ${filePath}`)
  } else {
    console.log(`✓ Already correct: ${filePath}`)
  }
})

console.log('\n🎉 API Route types fixed!')