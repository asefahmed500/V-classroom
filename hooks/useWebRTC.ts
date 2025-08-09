"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import { Socket } from 'socket.io-client'
import SimplePeer from 'simple-peer'
import { socketManager } from '@/lib/socket-client'
import { connectionFallback } from '@/lib/connection-fallback'

interface Participant {
  id: string
  name: string
  video: boolean
  audio: boolean
  isHost: boolean
}

interface UseWebRTCProps {
  roomId: string
  userId: string
  userName: string
}

export const useWebRTC = ({ roomId, userId, userName }: UseWebRTCProps) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  
  const peersRef = useRef<Map<string, SimplePeer.Instance>>(new Map())
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recordingStreamRef = useRef<MediaStream | null>(null)

  // Initialize socket connection using socket manager
  useEffect(() => {
    let mounted = true
    let connectionRetries = 0
    const maxRetries = 3

    const initSocket = async () => {
      try {
        const socket = await socketManager.getSocket()
        if (mounted) {
          setSocket(socket)
          connectionFallback.stopFallback() // Stop fallback if socket connects
          
          // Set up connection status monitoring
          socket.on('connect', () => {
            console.log('✅ WebRTC socket connected')
            connectionFallback.stopFallback()
          })
          
          socket.on('disconnect', () => {
            console.log('❌ WebRTC socket disconnected')
            // Start fallback system
            if (roomId && userId) {
              connectionFallback.startFallback(roomId, userId, (data) => {
                setParticipants(data.participants || [])
              })
            }
          })
          
          socket.on('connection-confirmed', ({ socketId }) => {
            console.log('✅ WebRTC connection confirmed:', socketId)
          })
        }
      } catch (error) {
        console.error('❌ Failed to initialize socket:', error)
        connectionRetries++
        
        if (connectionRetries < maxRetries && mounted) {
          console.log(`🔄 Retrying socket connection (${connectionRetries}/${maxRetries})...`)
          setTimeout(initSocket, 3000 * connectionRetries) // Exponential backoff
        } else if (mounted && roomId && userId) {
          // Start fallback system if socket fails completely
          console.log('🔄 Starting fallback connection system...')
          connectionFallback.startFallback(roomId, userId, (data) => {
            setParticipants(data.participants || [])
          })
        }
      }
    }

    initSocket()

    return () => {
      mounted = false
      connectionFallback.stopFallback()
    }
  }, [roomId, userId])

  // Get user media with better error handling
  const getUserMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      setLocalStream(stream)
      
      // Set video element source only once to prevent flickering
      if (localVideoRef.current && localVideoRef.current.srcObject !== stream) {
        localVideoRef.current.srcObject = stream
      }
      
      return stream
    } catch (error) {
      console.error('Error accessing media devices:', error)
      // Try with lower constraints if high quality fails
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        })
        setLocalStream(fallbackStream)
        if (localVideoRef.current && localVideoRef.current.srcObject !== fallbackStream) {
          localVideoRef.current.srcObject = fallbackStream
        }
        return fallbackStream
      } catch (fallbackError) {
        console.error('Fallback media access failed:', fallbackError)
        return null
      }
    }
  }, [])

  // Join room with retry logic
  useEffect(() => {
    if (socket && roomId && userId && userName) {
      console.log('🚪 Joining room:', { roomId, userId, userName })
      
      let joinAttempts = 0
      const maxJoinAttempts = 3
      
      const attemptJoin = () => {
        joinAttempts++
        console.log(`🚪 Join attempt ${joinAttempts}/${maxJoinAttempts}`)
        socket.emit('join-room', { roomId, userId, userName })
      }
      
      // Initial join attempt
      attemptJoin()
      
      // Set up room-specific event listeners
      const handleRoomJoined = (data) => {
        console.log('✅ Successfully joined room:', data)
        joinAttempts = 0 // Reset attempts on success
      }
      
      const handleRoomJoinError = (error) => {
        console.error('❌ Failed to join room:', error)
        
        // Retry if we haven't exceeded max attempts
        if (joinAttempts < maxJoinAttempts) {
          console.log(`🔄 Retrying join in 2 seconds... (${joinAttempts}/${maxJoinAttempts})`)
          setTimeout(attemptJoin, 2000)
        } else {
          console.error('❌ Max join attempts exceeded')
        }
      }
      
      socket.on('room-joined', handleRoomJoined)
      socket.on('room-join-error', handleRoomJoinError)
      
      return () => {
        socket.off('room-joined', handleRoomJoined)
        socket.off('room-join-error', handleRoomJoinError)
      }
    }
  }, [socket, roomId, userId, userName])

  // Initialize media and socket listeners
  useEffect(() => {
    if (!socket) return

    let mounted = true
    
    const initializeMedia = async () => {
      const stream = await getUserMedia()
      if (!mounted) return
      
      // Set local stream regardless of socket connection status
      if (stream) {
        setLocalStream(stream)
        console.log('📹 Local media stream initialized')
      }
    }

    initializeMedia()

    // Socket event listeners
    socket.on('user-joined', ({ userId: newUserId, userName: newUserName, participants: updatedParticipants }) => {
      if (!mounted) return
      const participantsList = updatedParticipants || []
      console.log('👥 User joined:', newUserName, 'Total participants:', participantsList.length)
      setParticipants(participantsList)
      
      // Create peer connection for new user with current stream
      if (localStream && newUserId !== userId) {
        console.log('🤝 Creating peer connection with:', newUserName)
        createPeer(newUserId, true, localStream)
      }
    })

    socket.on('user-left', ({ userId: leftUserId, participants: updatedParticipants }) => {
      const participantsList = updatedParticipants || []
      setParticipants(participantsList)
      
      // Clean up peer connection
      const peer = peersRef.current.get(leftUserId)
      if (peer) {
        peer.destroy()
        peersRef.current.delete(leftUserId)
      }
      
      // Remove remote stream
      setRemoteStreams(prev => {
        const newStreams = new Map(prev)
        newStreams.delete(leftUserId)
        return newStreams
      })
    })

    socket.on('room-state', ({ participants: roomParticipants }) => {
      console.log('🏠 Room state updated:', roomParticipants.length, 'participants')
      setParticipants(roomParticipants)
    })

    socket.on('user-media-changed', ({ userId: changedUserId, video, audio }) => {
      setParticipants(prev => 
        prev.map(p => 
          p.id === changedUserId ? { ...p, video, audio } : p
        )
      )
    })

    // WebRTC signaling
    socket.on('offer', ({ offer, from }) => {
      if (localStream) {
        createPeer(from, false, localStream, offer)
      }
    })

    socket.on('answer', ({ answer, from }) => {
      const peer = peersRef.current.get(from)
      if (peer) {
        peer.signal(answer)
      }
    })

    socket.on('ice-candidate', ({ candidate, from }) => {
      const peer = peersRef.current.get(from)
      if (peer) {
        peer.signal(candidate)
      }
    })

    return () => {
      mounted = false
      socket.off('user-joined')
      socket.off('user-left')
      socket.off('room-state')
      socket.off('user-media-changed')
      socket.off('offer')
      socket.off('answer')
      socket.off('ice-candidate')
    }
  }, [socket, userId, getUserMedia])

  // Create peer connection with better error handling
  const createPeer = useCallback((targetUserId: string, initiator: boolean, stream: MediaStream, offer?: any) => {
    // Clean up existing peer if it exists
    const existingPeer = peersRef.current.get(targetUserId)
    if (existingPeer) {
      existingPeer.destroy()
    }

    const peer = new SimplePeer({
      initiator,
      trickle: false,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    })

    peer.on('signal', (signal) => {
      if (socket && socket.connected) {
        if (initiator) {
          socket.emit('offer', { offer: signal, to: targetUserId, from: userId, roomId })
        } else {
          socket.emit('answer', { answer: signal, to: targetUserId, from: userId, roomId })
        }
      }
    })

    peer.on('stream', (remoteStream) => {
      console.log('Received remote stream from:', targetUserId)
      setRemoteStreams(prev => {
        const newStreams = new Map(prev)
        newStreams.set(targetUserId, remoteStream)
        return newStreams
      })
    })

    peer.on('connect', () => {
      console.log('Peer connected:', targetUserId)
    })

    peer.on('error', (error) => {
      console.error('Peer connection error with', targetUserId, ':', error)
      // Clean up failed peer
      peersRef.current.delete(targetUserId)
      setRemoteStreams(prev => {
        const newStreams = new Map(prev)
        newStreams.delete(targetUserId)
        return newStreams
      })
    })

    peer.on('close', () => {
      console.log('Peer connection closed:', targetUserId)
      peersRef.current.delete(targetUserId)
      setRemoteStreams(prev => {
        const newStreams = new Map(prev)
        newStreams.delete(targetUserId)
        return newStreams
      })
    })

    if (offer) {
      peer.signal(offer)
    }

    peersRef.current.set(targetUserId, peer)
  }, [socket, userId, roomId])

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream && socket) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
        socket.emit('toggle-video', { roomId, userId, video: videoTrack.enabled })
      }
    }
  }, [localStream, socket, roomId, userId])

  // Toggle audio with better handling
  const toggleAudio = useCallback(() => {
    if (localStream && socket) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioEnabled(audioTrack.enabled)
        socket.emit('toggle-audio', { roomId, userId, audio: audioTrack.enabled })
        
        // Visual feedback
        console.log(`Audio ${audioTrack.enabled ? 'enabled' : 'disabled'}`)
      }
    }
  }, [localStream, socket, roomId, userId])

  // Volume control for remote streams
  const setRemoteVolume = useCallback((participantId: string, volume: number) => {
    const stream = remoteStreams.get(participantId)
    if (stream) {
      const audioTracks = stream.getAudioTracks()
      audioTracks.forEach(track => {
        // Note: Direct volume control on tracks is limited
        // This would typically be handled by the audio element
        console.log(`Setting volume for ${participantId} to ${volume}`)
      })
    }
  }, [remoteStreams])

  // Screen sharing with better handling
  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            mediaSource: 'screen',
            width: { max: 1920 },
            height: { max: 1080 },
            frameRate: { max: 30 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        })
        
        // Notify other users about screen sharing
        if (socket) {
          socket.emit('screen-share-started', { roomId, userId, userName })
        }
        
        // Replace video track in all peer connections
        const videoTrack = screenStream.getVideoTracks()[0]
        const audioTrack = screenStream.getAudioTracks()[0]
        
        peersRef.current.forEach(peer => {
          // Replace video track
          const videoSender = peer._pc?.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          )
          if (videoSender && videoTrack) {
            videoSender.replaceTrack(videoTrack)
          }
          
          // Add audio track if available
          if (audioTrack) {
            const audioSender = peer._pc?.getSenders().find(s => 
              s.track && s.track.kind === 'audio'
            )
            if (audioSender) {
              audioSender.replaceTrack(audioTrack)
            }
          }
        })

        // Update local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream
        }

        setIsScreenSharing(true)

        // Handle screen share end
        videoTrack.onended = () => {
          stopScreenShare()
        }
        
        if (audioTrack) {
          audioTrack.onended = () => {
            stopScreenShare()
          }
        }
      } else {
        stopScreenShare()
      }
    } catch (error) {
      console.error('Error sharing screen:', error)
      if (error.name === 'NotAllowedError') {
        alert('Screen sharing permission denied. Please allow screen sharing and try again.')
      } else if (error.name === 'NotSupportedError') {
        alert('Screen sharing is not supported in this browser.')
      } else {
        alert('Failed to start screen sharing. Please try again.')
      }
    }
  }, [isScreenSharing, socket, roomId, userId, userName])

  const stopScreenShare = useCallback(async () => {
    if (localStream) {
      // Notify other users about screen sharing stop
      if (socket) {
        socket.emit('screen-share-stopped', { roomId, userId })
      }
      
      const videoTrack = localStream.getVideoTracks()[0]
      const audioTrack = localStream.getAudioTracks()[0]
      
      // Replace screen share tracks with camera tracks
      peersRef.current.forEach(peer => {
        // Replace video track
        const videoSender = peer._pc?.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        )
        if (videoSender && videoTrack) {
          videoSender.replaceTrack(videoTrack)
        }
        
        // Replace audio track
        const audioSender = peer._pc?.getSenders().find(s => 
          s.track && s.track.kind === 'audio'
        )
        if (audioSender && audioTrack) {
          audioSender.replaceTrack(audioTrack)
        }
      })

      // Update local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream
      }

      setIsScreenSharing(false)
    }
  }, [localStream, socket, roomId, userId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up all peer connections
      peersRef.current.forEach(peer => peer.destroy())
      peersRef.current.clear()
      
      // Stop local stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [localStream])

  // Screen recording functionality
  const startRecording = useCallback(async () => {
    try {
      // Get screen capture stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      })

      // Combine with microphone audio if available
      let combinedStream = screenStream
      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0]
        if (audioTrack) {
          combinedStream = new MediaStream([
            ...screenStream.getVideoTracks(),
            ...screenStream.getAudioTracks(),
            audioTrack
          ])
        }
      }

      recordingStreamRef.current = combinedStream
      recordedChunksRef.current = []

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: 'video/webm'
        })
        
        // Create download link
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `room-${roomId}-recording-${new Date().toISOString().slice(0, 19)}.webm`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        // Clean up
        if (recordingStreamRef.current) {
          recordingStreamRef.current.getTracks().forEach(track => track.stop())
          recordingStreamRef.current = null
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(1000) // Record in 1-second chunks
      setIsRecording(true)

      // Handle screen share end
      screenStream.getVideoTracks()[0].onended = () => {
        stopRecording()
      }

    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Failed to start recording. Please ensure you have the necessary permissions.')
    }
  }, [roomId, localStream])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  return {
    socket,
    participants,
    localStream,
    remoteStreams,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    isRecording,
    localVideoRef,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    toggleRecording,
    setRemoteVolume
  }
}