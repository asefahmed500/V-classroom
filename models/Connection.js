const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema({
  // Connection identification
  connectionId: { type: String, required: true, unique: true },
  socketId: { type: String, required: true },
  
  // User information
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userEmail: { type: String },
  isGuest: { type: Boolean, default: false },
  
  // Room information
  roomId: { type: String, required: true },
  roomCode: { type: String, required: true },
  
  // Connection status
  status: { 
    type: String, 
    enum: ['connecting', 'connected', 'disconnected', 'reconnecting'], 
    default: 'connecting' 
  },
  
  // Media states
  mediaState: {
    video: { type: Boolean, default: true },
    audio: { type: Boolean, default: true },
    screenShare: { type: Boolean, default: false }
  },
  
  // Connection metadata
  userAgent: String,
  ipAddress: String,
  connectionQuality: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: 'good'
  },
  
  // Timestamps
  connectedAt: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
  disconnectedAt: Date,
  
  // Session data
  sessionData: {
    joinMethod: { type: String, enum: ['code', 'link', 'direct'], default: 'code' },
    deviceType: { type: String, enum: ['desktop', 'mobile', 'tablet'], default: 'desktop' },
    browser: String,
    permissions: {
      canShare: { type: Boolean, default: true },
      canChat: { type: Boolean, default: true },
      canUseWhiteboard: { type: Boolean, default: true },
      canManageRoom: { type: Boolean, default: false }
    }
  }
});

// Indexes for efficient queries
connectionSchema.index({ roomId: 1, status: 1 });
connectionSchema.index({ userId: 1 });
connectionSchema.index({ socketId: 1 });
connectionSchema.index({ roomCode: 1 });
connectionSchema.index({ connectedAt: 1 });

// Methods
connectionSchema.methods.updateLastSeen = function() {
  this.lastSeen = new Date();
  return this.save();
};

connectionSchema.methods.disconnect = function() {
  this.status = 'disconnected';
  this.disconnectedAt = new Date();
  return this.save();
};

connectionSchema.methods.reconnect = function(newSocketId) {
  this.socketId = newSocketId;
  this.status = 'connected';
  this.lastSeen = new Date();
  this.disconnectedAt = undefined;
  return this.save();
};

// Static methods
connectionSchema.statics.getActiveConnections = function(roomId) {
  return this.find({ 
    roomId, 
    status: { $in: ['connected', 'reconnecting'] } 
  }).sort({ connectedAt: 1 });
};

connectionSchema.statics.cleanupStaleConnections = function(timeoutMinutes = 5) {
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);
  return this.updateMany(
    { 
      status: { $in: ['connected', 'reconnecting'] },
      lastSeen: { $lt: cutoff }
    },
    { 
      status: 'disconnected',
      disconnectedAt: new Date()
    }
  );
};

module.exports = mongoose.models.Connection || mongoose.model('Connection', connectionSchema);