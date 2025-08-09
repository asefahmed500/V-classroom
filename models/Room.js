const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userEmail: { type: String },
  joinedAt: { type: Date, default: Date.now },
  isHost: { type: Boolean, default: false },
  isGuest: { type: Boolean, default: false },
  video: { type: Boolean, default: true },
  audio: { type: Boolean, default: true },
  socketId: String
});

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subject: { type: String, required: true },
  description: String,
  roomCode: { type: String, required: true, unique: true }, // Custom room code for easy joining
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  maxParticipants: { type: Number, default: 8 },
  privacy: { type: String, enum: ['public', 'private'], default: 'public' },
  participants: [participantSchema],
  settings: {
    allowScreenShare: { type: Boolean, default: true },
    allowFileShare: { type: Boolean, default: true },
    allowChat: { type: Boolean, default: true },
    allowWhiteboard: { type: Boolean, default: true },
    allowNotes: { type: Boolean, default: true }
  },
  whiteboardData: [mongoose.Schema.Types.Mixed],
  timerState: {
    isRunning: { type: Boolean, default: false },
    timeLeft: { type: Number, default: 1500 },
    mode: { type: String, enum: ['work', 'shortBreak', 'longBreak'], default: 'work' },
    session: { type: Number, default: 1 }
  },
  lastActivity: { type: Date, default: Date.now }
});

// Index for efficient queries
roomSchema.index({ roomCode: 1 });
roomSchema.index({ createdBy: 1 });
roomSchema.index({ isActive: 1 });

module.exports = mongoose.models.Room || mongoose.model('Room', roomSchema);