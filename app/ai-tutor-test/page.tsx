"use client"

import { AITutor } from '@/components/ai-tutor'
import { Toaster } from 'sonner'

export default function AITutorTest() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Tutor Test</h1>
          <p className="text-gray-600">Test the AI tutor functionality with working API endpoints</p>
        </div>
        
        <div className="h-[600px]">
          <AITutor 
            roomId="test-room-123"
            userId="test-user-456"
            userName="Test User"
          />
        </div>
      </div>
      
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
        }}
      />
    </div>
  )
}