"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { VideoCallInterface } from "@/components/video-call-interface"

interface VideoCallData {
  roomId: string
  roomName: string
  roomCode: string
  hostId: string
  hostName: string
  participants: any[]
  messages: any[]
  sharedFiles: any[]
  settings: {
    allowScreenShare: boolean
    allowFileShare: boolean
    allowChat: boolean
    requireApproval: boolean
    recordingEnabled: boolean
  }
  startedAt: string
  isHost: boolean
}

export default function VideoCallRoomPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  
  const roomId = params.roomId as string
  const [videoCallData, setVideoCallData] = useState<VideoCallData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.user || !roomId) return
    
    loadVideoCallData()
  }, [session, roomId])

  const loadVideoCallData = async () => {
    try {
      const response = await fetch(`/api/video-calls/${roomId}`)
      
      if (response.ok) {
        const data = await response.json()
        setVideoCallData(data.videoCall)
      } else if (response.status === 404) {
        setError("Video call not found")
      } else if (response.status === 401) {
        setError("Please sign in to join this video call")
      } else {
        setError("Failed to load video call")
      }
    } catch (error) {
      console.error("Failed to load video call:", error)
      setError("Failed to load video call")
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveCall = async () => {
    try {
      // Update video call status
      await fetch(`/api/video-calls/${roomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'leave'
        })
      })
    } catch (error) {
      console.error("Error leaving call:", error)
    }
    
    // Navigate back to dashboard or home
    router.push("/dashboard")
  }

  const handleEndCall = async () => {
    if (!videoCallData?.isHost) {
      toast.error("Only the host can end the call")
      return
    }

    if (!confirm("Are you sure you want to end this call for everyone?")) {
      return
    }

    try {
      const response = await fetch(`/api/video-calls/${roomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'end-call'
        })
      })

      if (response.ok) {
        toast.success("Call ended")
        router.push("/dashboard")
      } else {
        toast.error("Failed to end call")
      }
    } catch (error) {
      console.error("Error ending call:", error)
      toast.error("Failed to end call")
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading video call...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-4">
            {error}
          </h1>
          <p className="text-gray-400 mb-6">
            The video call you're looking for might have ended or doesn't exist.
          </p>
          <div className="space-x-4">
            <button
              onClick={() => router.push("/video-call/create")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Create New Call
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Authentication check
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Please sign in to join the video call...</p>
        </div>
      </div>
    )
  }

  // Video call not found
  if (!videoCallData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <p>Video call not found</p>
        </div>
      </div>
    )
  }

  return (
    <VideoCallInterface
      roomId={videoCallData.roomId}
      roomName={videoCallData.roomName}
      roomCode={videoCallData.roomCode}
      userId={session.user.id!}
      userName={session.user.name!}
      userEmail={session.user.email!}
      isHost={videoCallData.isHost}
      onLeave={handleLeaveCall}
    />
  )
}