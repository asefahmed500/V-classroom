import { Socket } from 'socket.io-client'

export interface WebRTCConfig {
  iceServers: RTCIceServer[]
}

export interface Participant {
  id: string
  name: string
  stream?: MediaStream
  peerConnection?: RTCPeerConnection
  isVideoEnabled: boolean
  isAudioEnabled: boolean
}

export class WebRTCManager {
  private socket: Socket
  private localStream: MediaStream | null = null
  private participants: Map<string, Participant> = new Map()
  private roomId: string
  private userId: string
  private userName: string
  
  private config: WebRTCConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ]
  }

  constructor(
    socket: Socket, 
    roomId: string, 
    userId: string, 
    userName: string
  ) {
    this.socket = socket
    this.roomId = roomId
    this.userId = userId
    this.userName = userName
    
    this.setupSocketListeners()
  }

  private setupSocketListeners() {
    this.socket.on('user-joined', this.handleUserJoined.bind(this))
    this.socket.on('user-left', this.handleUserLeft.bind(this))
    this.socket.on('offer', this.handleOffer.bind(this))
    this.socket.on('answer', this.handleAnswer.bind(this))
    this.socket.on('ice-candidate', this.handleIceCandidate.bind(this))
    this.socket.on('user-media-changed', this.handleUserMediaChanged.bind(this))
  }

  async initializeLocalStream(constraints: MediaStreamConstraints = { video: true, audio: true }) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
      return this.localStream
    } catch (error) {
      console.error('Failed to get local stream:', error)
      throw error
    }
  }

  async startScreenShare() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true
      })

      // Replace video track in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0]
      
      for (const [participantId, participant] of this.participants) {
        if (participant.peerConnection) {
          const sender = participant.peerConnection.getSenders().find(
            s => s.track && s.track.kind === 'video'
          )
          
          if (sender) {
            await sender.replaceTrack(videoTrack)
          }
        }
      }

      // Handle screen share end
      videoTrack.onended = () => {
        this.stopScreenShare()
      }

      return screenStream
    } catch (error) {
      console.error('Failed to start screen share:', error)
      throw error
    }
  }

  async stopScreenShare() {
    if (!this.localStream) return

    const videoTrack = this.localStream.getVideoTracks()[0]
    
    // Replace screen share track with camera track
    for (const [participantId, participant] of this.participants) {
      if (participant.peerConnection) {
        const sender = participant.peerConnection.getSenders().find(
          s => s.track && s.track.kind === 'video'
        )
        
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack)
        }
      }
    }
  }

  private async handleUserJoined(data: { userId: string; userName: string; socketId: string }) {
    if (data.userId === this.userId) return

    console.log('User joined:', data)
    
    const participant: Participant = {
      id: data.userId,
      name: data.userName,
      isVideoEnabled: true,
      isAudioEnabled: true
    }

    this.participants.set(data.userId, participant)
    
    // Create peer connection and send offer
    await this.createPeerConnection(data.userId)
    await this.createOffer(data.userId)
  }

  private handleUserLeft(data: { userId: string }) {
    console.log('User left:', data)
    
    const participant = this.participants.get(data.userId)
    if (participant?.peerConnection) {
      participant.peerConnection.close()
    }
    
    this.participants.delete(data.userId)
  }

  private async createPeerConnection(participantId: string) {
    const peerConnection = new RTCPeerConnection(this.config)
    
    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!)
      })
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const participant = this.participants.get(participantId)
      if (participant) {
        participant.stream = event.streams[0]
        this.onParticipantStreamUpdate?.(participantId, event.streams[0])
      }
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          roomId: this.roomId,
          to: participantId,
          from: this.userId,
          candidate: event.candidate
        })
      }
    }

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state with ${participantId}:`, peerConnection.connectionState)
      
      if (peerConnection.connectionState === 'failed') {
        // Attempt to restart ICE
        peerConnection.restartIce()
      }
    }

    const participant = this.participants.get(participantId)
    if (participant) {
      participant.peerConnection = peerConnection
    }

    return peerConnection
  }

  private async createOffer(participantId: string) {
    const participant = this.participants.get(participantId)
    if (!participant?.peerConnection) return

    try {
      const offer = await participant.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      })
      
      await participant.peerConnection.setLocalDescription(offer)
      
      this.socket.emit('offer', {
        roomId: this.roomId,
        to: participantId,
        from: this.userId,
        offer
      })
    } catch (error) {
      console.error('Failed to create offer:', error)
    }
  }

  private async handleOffer(data: { from: string; offer: RTCSessionDescriptionInit }) {
    console.log('Received offer from:', data.from)
    
    let participant = this.participants.get(data.from)
    if (!participant) {
      participant = {
        id: data.from,
        name: 'Unknown',
        isVideoEnabled: true,
        isAudioEnabled: true
      }
      this.participants.set(data.from, participant)
    }

    if (!participant.peerConnection) {
      await this.createPeerConnection(data.from)
    }

    try {
      await participant.peerConnection!.setRemoteDescription(data.offer)
      
      const answer = await participant.peerConnection!.createAnswer()
      await participant.peerConnection!.setLocalDescription(answer)
      
      this.socket.emit('answer', {
        roomId: this.roomId,
        to: data.from,
        from: this.userId,
        answer
      })
    } catch (error) {
      console.error('Failed to handle offer:', error)
    }
  }

  private async handleAnswer(data: { from: string; answer: RTCSessionDescriptionInit }) {
    console.log('Received answer from:', data.from)
    
    const participant = this.participants.get(data.from)
    if (participant?.peerConnection) {
      try {
        await participant.peerConnection.setRemoteDescription(data.answer)
      } catch (error) {
        console.error('Failed to handle answer:', error)
      }
    }
  }

  private async handleIceCandidate(data: { from: string; candidate: RTCIceCandidateInit }) {
    console.log('Received ICE candidate from:', data.from)
    
    const participant = this.participants.get(data.from)
    if (participant?.peerConnection) {
      try {
        await participant.peerConnection.addIceCandidate(data.candidate)
      } catch (error) {
        console.error('Failed to add ICE candidate:', error)
      }
    }
  }

  private handleUserMediaChanged(data: { userId: string; video?: boolean; audio?: boolean }) {
    const participant = this.participants.get(data.userId)
    if (participant) {
      if (data.video !== undefined) {
        participant.isVideoEnabled = data.video
      }
      if (data.audio !== undefined) {
        participant.isAudioEnabled = data.audio
      }
      
      this.onParticipantMediaChanged?.(data.userId, {
        video: participant.isVideoEnabled,
        audio: participant.isAudioEnabled
      })
    }
  }

  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = enabled
        
        this.socket.emit('toggle-video', {
          roomId: this.roomId,
          userId: this.userId,
          video: enabled
        })
      }
    }
  }

  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = enabled
        
        this.socket.emit('toggle-audio', {
          roomId: this.roomId,
          userId: this.userId,
          audio: enabled
        })
      }
    }
  }

  getParticipants() {
    return Array.from(this.participants.values())
  }

  getLocalStream() {
    return this.localStream
  }

  cleanup() {
    // Close all peer connections
    for (const [participantId, participant] of this.participants) {
      if (participant.peerConnection) {
        participant.peerConnection.close()
      }
    }
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
    }
    
    this.participants.clear()
  }

  // Callback functions
  onParticipantStreamUpdate?: (participantId: string, stream: MediaStream) => void
  onParticipantMediaChanged?: (participantId: string, media: { video: boolean; audio: boolean }) => void
}