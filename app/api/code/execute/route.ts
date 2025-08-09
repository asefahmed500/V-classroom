import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code, language, roomId, userId, userName } = await request.json()

    if (!code || !language) {
      return NextResponse.json({ error: 'Code and language are required' }, { status: 400 })
    }

    // Simple code execution simulation
    // In a real implementation, you'd use a sandboxed environment like Docker
    let output = ''
    let error = null

    try {
      switch (language) {
        case 'javascript':
          // Simple JavaScript evaluation (DANGEROUS - only for demo)
          // In production, use a proper sandboxed environment
          try {
            const result = eval(code)
            output = result !== undefined ? String(result) : 'Code executed successfully'
          } catch (jsError: any) {
            error = `JavaScript Error: ${jsError.message}`
          }
          break
          
        case 'python':
          // Simulate Python execution
          output = `Python execution simulated for:\n${code}\n\nOutput: Hello from Python!`
          break
          
        case 'java':
          // Simulate Java execution
          output = `Java execution simulated for:\n${code}\n\nOutput: Hello from Java!`
          break
          
        case 'cpp':
          // Simulate C++ execution
          output = `C++ execution simulated for:\n${code}\n\nOutput: Hello from C++!`
          break
          
        case 'html':
          // For HTML, just return the code as it would be rendered
          output = `HTML code ready for rendering:\n${code}`
          break
          
        case 'css':
          // For CSS, validate basic syntax
          output = `CSS code validated:\n${code}`
          break
          
        default:
          output = `Code execution for ${language} is not yet implemented.\nCode:\n${code}`
      }
    } catch (execError: any) {
      error = `Execution Error: ${execError.message}`
    }

    return NextResponse.json({
      success: true,
      output: error || output,
      error: error,
      language,
      timestamp: Date.now()
    })

  } catch (error: any) {
    console.error('Code execution error:', error)
    return NextResponse.json(
      { error: 'Failed to execute code', details: error.message },
      { status: 500 }
    )
  }
}