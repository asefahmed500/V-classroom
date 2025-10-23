# 🎓 Virtual Study Rooms - AI-Powered Collaborative Learning Platform

> Transform isolated studying into engaging collaborative learning experiences for high school students

[![Next.js](https://img.shields.io/badge/Next.js-14.0-black)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.3-green)](https://mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-blue)](https://socket.io/)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI-purple)](https://ai.google.dev/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Media-orange)](https://cloudinary.com/)

## 🌟 Features Overview

### ✅ **HD Video Study Rooms**
- **Crystal-clear video chat** with up to 8 participants
- **Screen sharing** capabilities for presentations
- **Noise cancellation** for focused study sessions
- **Real-time participant management** with host controls

### ✅ **Interactive Whiteboard**
- **Real-time collaborative drawing** with multiple tools
- **Math equations support** and templates
- **Infinite canvas space** with zoom and pan
- **Shape tools** (rectangles, circles, lines)
- **Text annotations** and sticky notes
- **Save and export** whiteboard sessions

### ✅ **Smart Study Timer**
- **Pomodoro technique** implementation
- **Group synchronization** - all participants see the same timer
- **Break reminders** and session tracking
- **Productivity analytics** and statistics
- **Custom timer modes** (focus, short break, long break)

### ✅ **AI Study Assistant**
- **Personalized study suggestions** powered by Google Gemini
- **Practice questions** generation
- **Concept explanations** in simple terms
- **Learning path optimization**
- **Subject-specific tutoring** (Math, Science, History, etc.)
- **Chat history** and context awareness

### ✅ **Smart File Sharing**
- **Drag-and-drop** file uploads
- **Automatic organization** by room and date
- **Version control** and file history
- **Collaborative editing** for documents
- **Cloud storage** integration with Cloudinary
- **File preview** and thumbnail generation

### ✅ **Collaborative Notes**
- **Real-time editing** with live cursors
- **Markdown support** for formatting
- **Version history** and auto-save
- **Multi-user collaboration** indicators
- **Export options** (PDF, TXT, MD)

### ✅ **Live Chat System**
- **Instant messaging** with emoji reactions
- **File attachments** and media sharing
- **Reply threads** and message organization
- **Typing indicators** and read receipts
- **Message search** and history

### ✅ **Study Communities**
- **Subject-specific rooms** for focused learning
- **Peer matching** system
- **Study buddy** recommendations
- **Achievement tracking** and gamification
- **Progress analytics** and insights

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB Atlas account
- Cloudinary account
- Google AI Studio API key

### 1. Clone and Install
```bash
git clone <repository-url>
cd virtual-study-rooms
npm install
```

### 2. Environment Setup
Create `.env.local` file:
```env
# Database
MONGODB_URI=

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=5e58e644fef05659d4dc3818318878b37ee7736106770b73daab47c9bb0d22dd

# Cloudinary (File Storage)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# AI Integration
GEMINI_API_KEY=

# Environment
NODE_ENV=development
```

### 3. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

### 4. Verify Installation
```bash
node scripts/final-check.js
```

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, Socket.IO
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js with JWT
- **Real-time**: Socket.IO for live collaboration
- **AI**: Google Gemini Pro API
- **File Storage**: Cloudinary
- **UI Components**: Radix UI, Lucide Icons

### Project Structure
```
virtual-study-rooms/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # User dashboard
│   ├── rooms/             # Study room pages
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── study-room.tsx    # Main study room component
│   ├── enhanced-video-chat.tsx
│   ├── collaborative-whiteboard.tsx
│   ├── ai-tutor.tsx
│   └── ...
├── lib/                   # Utility libraries
│   ├── mongodb.ts        # Database connection
│   └── auth.ts           # Authentication config
├── models/               # Database models
├── server/               # Socket.IO server
├── scripts/              # Utility scripts
└── public/               # Static assets
```

## 🔧 API Documentation

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Rooms
- `POST /api/rooms/create` - Create study room
- `POST /api/rooms/join` - Join existing room
- `GET /api/rooms/[id]` - Get room details
- `GET /api/rooms/list` - List public rooms

### Chat & Communication
- `GET /api/chat/messages` - Get chat history
- `POST /api/chat/messages` - Send message
- `POST /api/chat/reactions` - Add message reaction

### File Management
- `POST /api/upload` - Upload files
- `GET /api/files/[roomId]` - Get room files
- `DELETE /api/files/[roomId]` - Delete file

### AI Tutor
- `POST /api/ai-tutor/chat` - Chat with AI
- `GET /api/ai-tutor/history` - Get chat history

### Analytics
- `GET /api/analytics/user/[userId]` - User analytics
- `POST /api/analytics/track` - Track activity

## 🎮 Socket.IO Events

### Room Management
- `join-room` - Join a study room
- `leave-room` - Leave a study room
- `user-joined` - New user joined
- `user-left` - User left room

### Video Chat
- `offer` - WebRTC offer
- `answer` - WebRTC answer
- `ice-candidate` - ICE candidate
- `toggle-video` - Toggle video
- `toggle-audio` - Toggle audio

### Collaboration
- `whiteboard-draw` - Whiteboard drawing
- `whiteboard-clear` - Clear whiteboard
- `notes-update` - Notes update
- `cursor-position` - Cursor position
- `chat-message` - Chat message
- `file-shared` - File shared

### Study Timer
- `timer-start` - Start timer
- `timer-pause` - Pause timer
- `timer-reset` - Reset timer
- `timer-update` - Timer update

## 🧪 Testing

### Run Comprehensive Tests
```bash
# Check all features
node scripts/final-check.js

# Test API endpoints
curl http://localhost:3000/api/test/comprehensive

# Verify deployment readiness
node scripts/pre-deploy-check.js
```

### Feature Testing Checklist
- [ ] User registration and login
- [ ] Room creation and joining
- [ ] Video chat with multiple users
- [ ] Whiteboard collaboration
- [ ] File upload and sharing
- [ ] Real-time chat
- [ ] AI tutor responses
- [ ] Study timer synchronization
- [ ] Notes collaboration
- [ ] Analytics tracking

## 🚀 Deployment

### Vercel Deployment (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

### Manual Deployment
```bash
# Build for production
npm run build

# Start production server
npm start
```

### Environment Variables for Production
Update these in your deployment platform:
- `NEXTAUTH_URL` - Your production domain
- `MONGODB_URI` - Production database
- All other variables remain the same

## 📊 Monitoring & Analytics

### Built-in Analytics
- User study time tracking
- Session completion rates
- Feature usage statistics
- Room participation metrics
- AI tutor interaction data

### Performance Monitoring
- Real-time connection status
- Video quality metrics
- File upload/download speeds
- Database query performance

## 🔒 Security Features

- **JWT Authentication** with secure tokens
- **Input validation** and sanitization
- **Rate limiting** on API endpoints
- **CORS protection** for cross-origin requests
- **File upload restrictions** and validation
- **Environment variable protection**

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **PANDA Hacks 2025** - Hackathon project
- **Google Gemini** - AI integration
- **Cloudinary** - Media management
- **MongoDB Atlas** - Database hosting
- **Vercel** - Deployment platform

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Email: support@virtualstudyrooms.com
- Discord: [Join our community](https://discord.gg/studyrooms)

---

**Built with ❤️ for students, by students**

*Transforming education through collaborative learning and AI-powered tools.*