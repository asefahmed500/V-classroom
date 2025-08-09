import mongoose from "mongoose"

const ParticipantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.Mixed, // Allow both ObjectId and string for demo users
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  isHost: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
})

const StudyRoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    roomType: {
      type: String,
      enum: ["silent", "discussion", "focus", "group"],
      default: "discussion",
    },
    maxParticipants: {
      type: Number,
      default: 8,
      min: 2,
      max: 20,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    roomCode: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      length: 6,
    },
    host: {
      type: mongoose.Schema.Types.Mixed, // Allow both ObjectId and string for demo users
      required: true,
    },
    participants: [ParticipantSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
    totalDuration: {
      type: Number,
      default: 0, // in minutes
    },
    settings: {
      allowScreenShare: {
        type: Boolean,
        default: true,
      },
      allowFileSharing: {
        type: Boolean,
        default: true,
      },
      allowChat: {
        type: Boolean,
        default: true,
      },
      allowWhiteboard: {
        type: Boolean,
        default: true,
      },
      recordSession: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
)

// Generate room code before saving
StudyRoomSchema.pre("save", function (next) {
  if (!this.roomCode) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    this.roomCode = result
  }
  next()
})

// Index for efficient queries
StudyRoomSchema.index({ isActive: 1, createdAt: -1 })
StudyRoomSchema.index({ host: 1 })
StudyRoomSchema.index({ "participants.userId": 1 })

export const StudyRoom = (mongoose.models.StudyRoom || mongoose.model("StudyRoom", StudyRoomSchema)) as any