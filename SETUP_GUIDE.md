# 🚀 Virtual Study Rooms - Complete Setup Guide

## 📋 Overview

Virtual Study Rooms is a comprehensive study collaboration platform featuring:
- **Multi-user Video Chat** (up to 8 participants)
- **Collaborative Whiteboard** with real-time sync
- **Synchronized Pomodoro Timer** across all users
- **File Sharing** with drag-and-drop support
- **Real-time Chat** with reactions and typing indicators
- **Collaborative Notes** with live editing
- **AI Study Assistant** powered by Google Gemini
- **Room Management** with invitations and analytics

## 🛠️ Prerequisites

- **Node.js** v18 or higher
- **MongoDB** (local or MongoDB Atlas)
- **Google Gemini API Key**

## ⚡ Quick Start

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd virtual-study-rooms
npm install
```

### 2. Environment Setup
Create `.env.local` in the root directory:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/virtual-study-rooms
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/virtual-study-rooms

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# AI Integration
GEMINI_API_KEY=your-gemini-api-key-from-google-ai-studio

# App Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development

# Optional: File Upload Configuration
UPLOAD_MAX_SIZE=52428800
UPLOAD_ALLOWED_TYPES=pdf,doc,docx,txt,png,jpg,jpeg,gif,mp4,mp3
```

### 3. Database Setup

#### Option A: Local MongoDB
```bash
# Install MongoDB locally
# macOS (with Homebrew)
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt install mongodb
sudo systemctl start mongod

# Windows
# Download from https://www.mongodb.com/try/download/community
```

#### Option B: MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string and update `MONGODB_URI`

### 4. Get Google Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to `GEMINI_API_KEY` in `.env.local`

### 5. Create Uploads Directory
```bash
mkdir -p public/uploads
```

### 6. Run the Application
```bash
# Development with Socket.io server
npm run dev:full

# Or run separately
npm run dev        # Next.js app
npm run socket     # Socket.io server (in another terminal)
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎯 Feature Testing Checklist

Run the automated test script:
```bash
node scripts/test-features.js
```

### Manual Testing Steps:

1. **✅ User Registration/Login**
   - Navigate to `/auth/signup`
   - Create account and login

2. **✅ Dashboard**
   - View study statistics
   - Browse active rooms
   - Use room code input

3. **✅ Room Creation**
   - Navigate to `/rooms/create`
   - Test different room types
   - Configure privacy settings

4. **✅ Video Chat**
   - Join room with multiple browser tabs
   - Test audio/video controls
   - Try screen sharing

5. **✅ Collaborative Whiteboard**
   - Draw with different tools
   - Test real-time sync between users
   - Try different colors and brush sizes

6. **✅ File Sharing**
   - Drag and drop files
   - Test download functionality
   - Check file size limits

7. **✅ Real-time Chat**
   - Send messages between users
   - Test typing indicators
   - Try file attachments

8. **✅ Collaborative Notes**
   - Create and edit notes
   - Test real-time collaboration
   - Export notes functionality

9. **✅ Synchronized Timer**
   - Start Pomodoro timer as host
   - Verify sync across participants
   - Test pause/resume/reset

10. **✅ AI Assistant**
    - Navigate to `/ai-assistant`
    - Ask study questions
    - Test different prompt types

## 🔧 Configuration Options

### Room Types
- **Discussion**: Open collaboration with all features
- **Silent Study**: Focused study with minimal distractions
- **Focus Mode**: Pomodoro-based study sessions
- **Group Project**: Enhanced collaboration tools

### File Upload Settings
```env
UPLOAD_MAX_SIZE=52428800        # 50MB in bytes
UPLOAD_ALLOWED_TYPES=pdf,doc,docx,txt,png,jpg,jpeg,gif,mp4,mp3
```

### Socket.io Configuration
The Socket.io server runs on port 3001 by default. Configure with:
```env
SOCKET_PORT=3001
```

## 🚀 Production Deployment

### Vercel Deployment
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Manual Deployment
```bash
npm run build
npm start
```

### Docker Deployment
```bash
# Development
docker-compose up

# Production
docker-compose -f docker-compose.production.yml up
```

## 📊 Database Schema

### Collections Created:
- `users` - User accounts and profiles
- `studyrooms` - Room configurations and participants
- `notes` - Collaborative notes
- `files` - File metadata and sharing info
- `whiteboards` - Whiteboard drawing data
- `studysessions` - Study session analytics

## 🔍 Troubleshooting

### Common Issues:

**MongoDB Connection Error**
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Check connection string format
mongodb://localhost:27017/virtual-study-rooms
```

**Video Chat Not Working**
- Check browser permissions for camera/microphone
- Ensure HTTPS in production (WebRTC requirement)
- Test with different browsers

**Socket.io Connection Issues**
- Verify `NEXT_PUBLIC_SITE_URL` matches your domain
- Check firewall settings
- Ensure WebSocket support

**AI Assistant Not Responding**
- Verify `GEMINI_API_KEY` is correct
- Check API quota limits
- Test API key at Google AI Studio

**File Upload Fails**
- Check `public/uploads` directory exists
- Verify file size limits
- Ensure proper permissions

## 📈 Performance Optimization

### For Production:
1. **Database Indexing**: Already configured in models
2. **File Compression**: Implement for large uploads
3. **CDN**: Use for static assets
4. **Redis**: For session storage and caching
5. **Load Balancing**: For multiple server instances

### Monitoring:
- Monitor MongoDB performance
- Track Socket.io connection counts
- Monitor file storage usage
- Track AI API usage

## 🎬 Demo Script for Presentations

### 5-Minute Demo Flow:
1. **Opening** (30s): Show dashboard and room creation
2. **Video Chat** (60s): Multi-user video with screen sharing
3. **Collaboration** (90s): Whiteboard + real-time notes
4. **AI Assistant** (60s): Ask study questions and get help
5. **Features Overview** (60s): File sharing, timer, chat
6. **Closing** (30s): Analytics and study tracking

### Key Talking Points:
- "Recreates in-person study group energy online"
- "All-in-one platform eliminates app switching"
- "AI tutor provides instant help and motivation"
- "Real-time collaboration keeps everyone engaged"
- "Analytics help track study progress"

## 🏆 Competition Highlights

### Technical Innovation:
- **WebRTC** for peer-to-peer video communication
- **Real-time collaboration** with Socket.io
- **AI integration** with Google Gemini
- **Responsive design** for mobile and desktop
- **Scalable architecture** with MongoDB

### User Experience:
- **Intuitive interface** designed for students
- **Seamless collaboration** without learning curve
- **Motivational features** like study streaks
- **Accessibility** considerations throughout

### Impact Potential:
- **Addresses real problem**: Remote learning engagement
- **Scalable solution**: Can serve thousands of students
- **Educational value**: Improves study outcomes
- **Community building**: Connects students globally

## 📞 Support

For issues or questions:
1. Check this setup guide
2. Run the test script: `node scripts/test-features.js`
3. Check browser console for errors
4. Verify environment variables
5. Test with different browsers/devices

---

**🎉 Congratulations! Your Virtual Study Rooms platform is ready to transform online education!**