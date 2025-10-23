"use client"

import { useRef, useEffect } from "react"
import { Mic, MicOff, Video, VideoOff, Monitor, Hand } from "lucide-react"

interface Participant {
  id: string
  name: string
  videoEnabled: boolean
  audioEnabled: boolean
  isScreenSharing: boolean
  isHandRaised: boolean
  stream?: MediaStream
}

interface VideoGridProps {
  participants: Participant[]
  localStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>
  localVideoRef: React.RefObject<HTMLVideoElement>
  currentUserId: string
  layout: 'grid' | 'spotlight' | 'sidebar'
}

export function VideoGrid({
  participants,
  localStream,
  remoteStreams,
  localVideoRef,
  currentUserId,
  layout
}: VideoGridProps) {
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())

  // Update remote video elements when streams change
  useEffect(() => {
    remoteStreams.forEach((stream, participantId) => {
      const videoElement = remoteVideoRefs.current.get(participantId)
      if (videoElement && videoElement.srcObject !== stream) {
        videoElement.srcObject = stream
      }
    })
  }, [remoteStreams])

  const VideoTile = ({ participant, isLocal = false }: { participant: Participant; isLocal?: boolean }) => {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
      if (isLocal && localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream
      } else if (!isLocal && videoRef.current) {
        const stream = remoteStreams.get(participant.id)
        if (stream) {
          videoRef.current.srcObject = stream
          remoteVideoRefs.current.set(participant.id, videoRef.current)
        }
      }
    }, [participant.id, isLocal, localStream])

    return (
      <div className="relative bg-gray-800 rounded-lg overflow-hidden group">
        {/* Video Element */}
        <video
          ref={isLocal ? localVideoRef : videoRef}
          autoPlay
          muted={isLocal}
          playsInline
          className={`w-full h-full object-cover ${
            !participant.videoEnabled ? 'hidden' : ''
          }`}
        />
        
        {/* Avatar when video is off */}
        {!participant.videoEnabled && (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <div className="text-white text-4xl font-bold">
              {participant.name[0].toUpperCase()}
            </div>
          </div>
        )}
        
        {/* Participant Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-white font-medium text-sm">
                {participant.name}
                {isLocal && " (You)"}
              </span>
              {participant.isHandRaised && (
                <Hand className="w-4 h-4 text-yellow-400" />
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              {participant.isScreenSharing && (
                <div className="bg-green-500 rounded-full p-1">
                  <Monitor className="w-3 h-3 text-white" />
                </div>
              )}
              {!participant.audioEnabled && (
                <div className="bg-red-500 rounded-full p-1">
                  <MicOff className="w-3 h-3 text-white" />
                </div>
              )}
              {!participant.videoEnabled && (
                <div className="bg-red-500 rounded-full p-1">
                  <VideoOff className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Speaking Indicator */}
        {participant.audioEnabled && (
          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-green-500 rounded-full p-1">
              <Mic className="w-3 h-3 text-white" />
            </div>
          </div>
        )}
        
        {/* Connection Quality Indicator */}
        <div className="absolute top-2 right-2">
          <div className="flex space-x-1">
            <div className="w-1 h-3 bg-white/50 rounded-full"></div>
            <div className="w-1 h-4 bg-white/70 rounded-full"></div>
            <div className="w-1 h-5 bg-white rounded-full"></div>
          </div>
        </div>
      </div>
    )
  }

  const renderGridLayout = () => {
    // Include current user in participants list
    const allParticipants = [
      {
        id: currentUserId,
        name: "You",
        videoEnabled: localStream?.getVideoTracks()[0]?.enabled ?? false,
        audioEnabled: localStream?.getAudioTracks()[0]?.enabled ?? false,
        isScreenSharing: false,
        isHandRaised: false
      },
      ...participants.filter(p => p.id !== currentUserId)
    ]

    const getGridClass = () => {
      const count = allParticipants.length
      if (count <= 1) return "grid-cols-1"
      if (count <= 4) return "grid-cols-2"
      if (count <= 9) return "grid-cols-3"
      if (count <= 16) return "grid-cols-4"
      return "grid-cols-5"
    }

    const getGridRows = () => {
      const count = allParticipants.length
      if (count <= 2) return "grid-rows-1"
      if (count <= 6) return "grid-rows-2"
      if (count <= 12) return "grid-rows-3"
      return "grid-rows-4"
    }

    return (
      <div className={`grid gap-2 h-full p-4 ${getGridClass()} ${getGridRows()}`}>
        {allParticipants.map((participant, index) => (
          <VideoTile
            key={participant.id}
            participant={participant}
            isLocal={participant.id === currentUserId}
          />
        ))}
      </div>
    )
  }

  const renderSpotlightLayout = () => {
    // Find the participant who is screen sharing or speaking
    const spotlightParticipant = participants.find(p => p.isScreenSharing) || 
                                participants[0] || 
                                { id: currentUserId, name: "You", videoEnabled: true, audioEnabled: true, isScreenSharing: false, isHandRaised: false }

    const otherParticipants = participants.filter(p => p.id !== spotlightParticipant.id)
    if (spotlightParticipant.id !== currentUserId) {
      otherParticipants.unshift({
        id: currentUserId,
        name: "You",
        videoEnabled: localStream?.getVideoTracks()[0]?.enabled ?? false,
        audioEnabled: localStream?.getAudioTracks()[0]?.enabled ?? false,
        isScreenSharing: false,
        isHandRaised: false
      })
    }

    return (
      <div className="h-full flex">
        {/* Main spotlight video */}
        <div className="flex-1 p-4">
          <VideoTile
            participant={spotlightParticipant}
            isLocal={spotlightParticipant.id === currentUserId}
          />
        </div>
        
        {/* Sidebar with other participants */}
        {otherParticipants.length > 0 && (
          <div className="w-64 p-2 space-y-2 overflow-y-auto">
            {otherParticipants.map((participant) => (
              <div key={participant.id} className="aspect-video">
                <VideoTile
                  participant={participant}
                  isLocal={participant.id === currentUserId}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderSidebarLayout = () => {
    // Similar to spotlight but with different proportions
    const mainParticipant = participants.find(p => p.isScreenSharing) || 
                           participants[0] || 
                           { id: currentUserId, name: "You", videoEnabled: true, audioEnabled: true, isScreenSharing: false, isHandRaised: false }

    const sidebarParticipants = participants.filter(p => p.id !== mainParticipant.id)
    if (mainParticipant.id !== currentUserId) {
      sidebarParticipants.unshift({
        id: currentUserId,
        name: "You",
        videoEnabled: localStream?.getVideoTracks()[0]?.enabled ?? false,
        audioEnabled: localStream?.getAudioTracks()[0]?.enabled ?? false,
        isScreenSharing: false,
        isHandRaised: false
      })
    }

    return (
      <div className="h-full flex flex-col">
        {/* Main video area */}
        <div className="flex-1 p-4">
          <VideoTile
            participant={mainParticipant}
            isLocal={mainParticipant.id === currentUserId}
          />
        </div>
        
        {/* Bottom sidebar with other participants */}
        {sidebarParticipants.length > 0 && (
          <div className="h-32 p-2 flex space-x-2 overflow-x-auto">
            {sidebarParticipants.map((participant) => (
              <div key={participant.id} className="w-24 h-full flex-shrink-0">
                <VideoTile
                  participant={participant}
                  isLocal={participant.id === currentUserId}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  switch (layout) {
    case 'spotlight':
      return renderSpotlightLayout()
    case 'sidebar':
      return renderSidebarLayout()
    default:
      return renderGridLayout()
  }
}