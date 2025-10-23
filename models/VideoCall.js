import mongoose from 'mongoose'

const participantSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  socketId: {
    type: String,
    required: true
  },
  isHost: {
    type: Boolean,
    default: false
  },
  videoEnabled: {
    type: Boolean,
    default: true
  },
  audioEnabled: {
    type: Boolean,
    default: true
  },
  isScreenSharing: {
    type: Boolean,
    default: false
  },
  isHandRaised: {
    type: Boolean,
    default: false
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  leftAt: {
    type: Date
  }
})

const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'file', 'image', 'system'],
    default: 'text'
  },
  fileUrl: String,
  fileName: String,
  fileSize: Number,
  timestamp: {
    type: Date,
    default: Date.now
  },
  reactions: [{
    userId: String,
    userName: String,
    emoji: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date
})

const sharedFileSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: String,
    required: true
  },
  uploaderName: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  downloadCount: {
    type: Number,
    default: 0
  }
})

const videoCallSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  roomName: {
    type: String,
    required: true
  },
  roomCode: {
    type: String,
    required: true
  },
  hostId: {
    type: String,
    required: true
  },
  hostName: {
    type: String,
    required: true
  },
  participants: [participantSchema],
  messages: [messageSchema],
  sharedFiles: [sharedFileSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: Date,
  duration: Number, // in seconds
  maxParticipants: {
    type: Number,
    default: 50
  },
  settings: {
    allowScreenShare: {
      type: Boolean,
      default: true
    },
    allowFileShare: {
      type: Boolean,
      default: true
    },
    allowChat: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    recordingEnabled: {
      type: Boolean,
      default: false
    }
  },
  recordingUrl: String,
  recordingDuration: Number
}, {
  timestamps: true
})

// Indexes for better performance
videoCallSchema.index({ roomId: 1 })
videoCallSchema.index({ roomCode: 1 })
videoCallSchema.index({ hostId: 1 })
videoCallSchema.index({ isActive: 1 })
videoCallSchema.index({ startedAt: -1 })

// Methods
videoCallSchema.methods.addParticipant = function(participantData) {
  // Remove existing participant if reconnecting
  this.participants = this.participants.filter(p => p.userId !== participantData.userId)
  this.participants.push(participantData)
  return this.save()
}

videoCallSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(p => p.userId === userId)
  if (participant) {
    participant.leftAt = new Date()
  }
  this.participants = this.participants.filter(p => p.userId !== userId)
  return this.save()
}

videoCallSchema.methods.addMessage = function(messageData) {
  this.messages.push(messageData)
  // Keep only last 1000 messages
  if (this.messages.length > 1000) {
    this.messages = this.messages.slice(-1000)
  }
  return this.save()
}

videoCallSchema.methods.addSharedFile = function(fileData) {
  this.sharedFiles.push(fileData)
  return this.save()
}

videoCallSchema.methods.endCall = function() {
  this.isActive = false
  this.endedAt = new Date()
  this.duration = Math.floor((this.endedAt - this.startedAt) / 1000)
  return this.save()
}

const VideoCall = mongoose.models.VideoCall || mongoose.model('VideoCall', videoCallSchema)

export default VideoCall