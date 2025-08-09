"use client"

import { AITutor } from "./ai-tutor"

interface StudyAssistantProps {
  roomId: string
  userId: string
  subject: string
}

export function StudyAssistant({ roomId, userId, subject }: StudyAssistantProps) {
  return (
    <div className="h-full">
      <AITutor 
        roomId={roomId} 
        userId={userId} 
        userName="User" // This should be passed from parent
      />
    </div>
  )
}