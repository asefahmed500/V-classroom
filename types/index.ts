// User types
export interface User {
  _id: string
  name: string
  email: string
  avatar?: string
  createdAt: string
  studyStats?: {
    totalStudyTime: number
    sessionsCompleted: number
    averageFocusScore: number
    favoriteSubjects: string[]
  }
}

// Room types
export interface StudyRoom {
  _id: string
  name: string
  subject: string
  description?: string
  roomType: "silent" | "discussion" | "focus" | "group"
  maxParticipants: number
  isPrivate: boolean
  roomCode: string
  host: {
    id: string
    name: string
    email: string
  }
  participants: Participant[]
  isActive: boolean
  createdAt: string
  settings: RoomSettings
}

export interface Participant {
  id: string
  name: string
  email?: string
  isHost: boolean
  videoEnabled: boolean
  audioEnabled: boolean
  isScreenSharing?: boolean
  isSpeaking?: boolean
  isHandRaised?: boolean
  joinedAt?: string
  isActive?: boolean
}

export interface RoomSettings {
  allowScreenShare: boolean
  allowFileSharing: boolean
  allowChat: boolean
  allowWhiteboard: boolean
  recordSession: boolean
  maxFileSize?: number
  allowedFileTypes?: string[]
}

// Timer types
export interface TimerState {
  timeLeft: number
  isRunning: boolean
  isBreak: boolean
  sessions: number
  startTime: number
  duration?: number
  type?: "pomodoro" | "custom"
}

// Chat types
export interface ChatMessage {
  id: string
  userId: string
  userName: string
  content: string
  timestamp: string
  type: "text" | "file" | "image" | "system"
  fileUrl?: string
  fileName?: string
  reactions?: { [emoji: string]: string[] }
  replyTo?: string
}

// Whiteboard types
export interface DrawingPoint {
  x: number
  y: number
}

export interface DrawingPath {
  id: string
  points: DrawingPoint[]
  color: string
  width: number
  tool: string
  userId: string
  timestamp?: number
}

// File sharing types
export interface SharedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploadedBy: string
  uploadedAt: number
  downloadCount: number
}

// Notes types
export interface CollaborativeNote {
  id: string
  title: string
  content: string
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
  isEditing?: boolean
}

// AI types
export interface AIMessage {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
  type?: "text" | "analysis" | "questions" | "recommendations"
}

export interface StudyMaterial {
  id: string
  title: string
  content: string
  subject: string
  type: "notes" | "document" | "image" | "video"
  uploadedAt: string
}

// Study session types
export interface StudySession {
  id: string
  userId: string
  roomId: string
  roomName: string
  subject: string
  joinedAt: string
  leftAt: string
  duration: number // in minutes
  activitiesCompleted: {
    videoChat: boolean
    whiteboard: boolean
    notes: boolean
    fileSharing: boolean
    chat: boolean
  }
  studyGoalsAchieved: number
  focusScore: number // 1-10 rating
}

// Socket event types
export interface SocketEvents {
  // Connection events
  "connect": () => void
  "disconnect": (reason: string) => void
  "join-room": (roomId: string, userId: string, userName: string) => void
  "leave-room": (roomId: string, userId: string) => void

  // User events
  "user-joined": (userData: { id: string; name: string; videoEnabled: boolean; audioEnabled: boolean }) => void
  "user-left": (userData: { userId: string; userName: string }) => void
  "user-video-toggle": (data: { userId: string; enabled: boolean }) => void
  "user-audio-toggle": (data: { userId: string; enabled: boolean }) => void

  // WebRTC events
  "webrtc-offer": (data: { offer: RTCSessionDescriptionInit; from: string }) => void
  "webrtc-answer": (data: { answer: RTCSessionDescriptionInit; from: string }) => void
  "webrtc-ice-candidate": (data: { candidate: RTCIceCandidateInit; from: string }) => void

  // Screen sharing events
  "screen-share-start": (data: { userId: string; userName: string }) => void
  "screen-share-stop": (data: { userId: string }) => void

  // Chat events
  "send-message": (data: { roomId: string; content: string; type?: string; fileUrl?: string; fileName?: string }) => void
  "new-message": (message: ChatMessage) => void
  "typing-start": (roomId: string) => void
  "typing-stop": (roomId: string) => void
  "user-typing": (data: { userId: string; userName: string }) => void
  "user-stopped-typing": (data: { userId: string }) => void

  // Whiteboard events
  "whiteboard-draw": (roomId: string, drawData: DrawingPath) => void
  "whiteboard-update": (drawData: DrawingPath) => void
  "whiteboard-clear": (roomId: string) => void
  "whiteboard-cleared": () => void

  // Notes events
  "note-create": (data: { roomId: string; title: string; content: string }) => void
  "note-created": (note: CollaborativeNote) => void
  "note-update": (data: { roomId: string; noteId: string; title: string; content: string }) => void
  "note-updated": (note: CollaborativeNote) => void
  "note-delete": (data: { roomId: string; noteId: string }) => void
  "note-deleted": (noteId: string) => void

  // Timer events
  "timer-start": (data: { roomId: string; duration: number; type: string }) => void
  "timer-started": (timerState: TimerState) => void
  "timer-pause": (roomId: string) => void
  "timer-paused": (timerState: TimerState) => void
  "timer-resume": (roomId: string) => void
  "timer-resumed": (timerState: TimerState) => void
  "timer-reset": (roomId: string) => void

  // File sharing events
  "file-shared": (roomId: string, fileData: SharedFile) => void

  // Hand raise events
  "hand-raise": (data: { roomId: string; userId: string; raised: boolean }) => void
  "hand-raised": (data: { userId: string; raised: boolean }) => void

  // Room state events
  "room-state": (state: {
    participants: Participant[]
    messages: ChatMessage[]
    whiteboardData: DrawingPath[]
    notes: CollaborativeNote[]
    timerState: TimerState | null
  }) => void

  // Error events
  "error": (error: string) => void
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> extends APIResponse<T> {
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Form types
export interface CreateRoomForm {
  name: string
  subject: string
  description?: string
  roomType: "silent" | "discussion" | "focus" | "group"
  maxParticipants: number
  isPrivate: boolean
  settings: RoomSettings
}

export interface JoinRoomForm {
  roomCode: string
}

export interface LoginForm {
  email: string
  password: string
}

export interface SignupForm {
  name: string
  email: string
  password: string
  confirmPassword: string
}

// Component prop types
export interface VideoTileProps {
  participant: Participant
  isLocal?: boolean
  localVideoRef?: React.RefObject<HTMLVideoElement>
  onPin?: () => void
  isPinned?: boolean
}

export interface WhiteboardToolbarProps {
  currentTool: string
  currentColor: string
  currentWidth: number
  onToolChange: (tool: string) => void
  onColorChange: (color: string) => void
  onWidthChange: (width: number) => void
  onClear: () => void
  onUndo: () => void
  onRedo: () => void
  onDownload: () => void
}

// Utility types
export type RoomType = "silent" | "discussion" | "focus" | "group"
export type MessageType = "text" | "file" | "image" | "system"
export type DrawingTool = "pen" | "eraser" | "rectangle" | "circle" | "text"
export type FileType = "document" | "image" | "video" | "audio" | "other"

// Environment types
export interface EnvironmentConfig {
  MONGODB_URI: string
  JWT_SECRET: string
  GEMINI_API_KEY: string
  NEXT_PUBLIC_SITE_URL: string
  NODE_ENV: "development" | "production" | "test"
  UPLOAD_MAX_SIZE?: string
  UPLOAD_ALLOWED_TYPES?: string
  SOCKET_PORT?: string
}