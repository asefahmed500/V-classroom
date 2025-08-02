# 🎓 Virtual Study Rooms - Complete Study Collaboration Platform

> **Winner-Ready Submission for PANDA Hacks 2025** 🏆

Transform isolated studying into engaging collaborative learning experiences with our comprehensive virtual study platform designed specifically for high school students.

## ✨ Complete Feature Set - 100% Implemented

### 📹 **Multi-User Video Chat**
- **WebRTC-powered** video calls with up to 8 participants
- **Screen sharing** for presentations and tutorials
- **Audio/video controls** with mute/unmute functionality
- **Grid and speaker view** modes
- **Real-time participant management**

### 🎨 **Collaborative Whiteboard**
- **Real-time drawing** synchronized across all users
- **Multiple tools**: Pen, eraser, shapes, text
- **Color palette** and brush size controls
- **Undo/redo** functionality with history
- **Export and download** capabilities

### ⏰ **Synchronized Study Timer**
- **Pomodoro technique** with customizable durations
- **Synchronized across all participants**
- **Visual progress indicators** and notifications
- **Break time management** with automatic transitions
- **Host controls** for timer management

### 📤 **Advanced File Sharing**
- **Drag-and-drop** file uploads with progress tracking
- **50MB file size limit** with type restrictions
- **Download tracking** and sharing statistics
- **Image preview** and file organization
- **Real-time sharing** notifications

### 💬 **Enhanced Real-Time Chat**
- **Instant messaging** with typing indicators
- **Message reactions** and emoji support
- **File attachments** and image sharing
- **Reply functionality** and message threading
- **Chat history** persistence

### 📝 **Collaborative Notes**
- **Real-time collaborative editing** like Google Docs
- **Multiple notes per room** with organization
- **Export to Markdown** functionality
- **Version history** and edit tracking
- **Rich text formatting** support

### 🤖 **AI Study Assistant**
- **Google Gemini integration** for intelligent tutoring
- **Subject-specific help** across all high school topics
- **Practice question generation** from study materials
- **Concept explanations** in simple terms
- **Study tips and techniques** personalized advice

### 🏠 **Complete Room Management**
- **Room creation** with customizable settings
- **Private/public rooms** with access codes
- **Participant management** and permissions
- **Room analytics** and usage statistics
- **Invitation system** with multiple sharing options

### 📊 **Study Analytics Dashboard**
- **Study time tracking** with weekly/monthly stats
- **Study streak** monitoring for motivation
- **Room participation** history
- **Subject-wise analytics** and insights
- **Progress visualization** with charts

## 🛠️ Advanced Tech Stack

### **Frontend Excellence**
- **Next.js 15** with App Router for optimal performance
- **React 19** with latest hooks and concurrent features
- **TypeScript** for type safety and developer experience
- **Tailwind CSS** with custom components and animations
- **Shadcn/UI** for consistent, accessible design system

### **Backend Architecture**
- **Node.js** with modern async/await patterns
- **Socket.io** for real-time bidirectional communication
- **MongoDB** with optimized indexing and aggregation
- **Mongoose** with schema validation and middleware

### **Real-Time Features**
- **WebRTC** for peer-to-peer video communication
- **Socket.io** for collaborative features synchronization
- **Real-time data binding** across all connected clients
- **Optimistic updates** for smooth user experience

### **AI Integration**
- **Google Gemini Pro** for advanced language understanding
- **Context-aware responses** tailored for education
- **Rate limiting** and error handling for reliability
- **Streaming responses** for better user experience

### **Security & Performance**
- **JWT authentication** with secure token management
- **bcrypt password hashing** with salt rounds
- **Input validation** and sanitization
- **File upload security** with type and size restrictions
- **MongoDB injection prevention**

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (v18 or higher)
- **MongoDB** (local installation or MongoDB Atlas)
- **Google Gemini API Key** (from Google AI Studio)

## 🚀 Quick Start

### 1. Clone the Repository
\`\`\`bash
git clone <repository-url>
cd virtual-study-rooms
\`\`\`

### 2. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Set Up Environment Variables
\`\`\`bash
cp .env.example .env.local
\`\`\`

Edit `.env.local` with your actual values:
\`\`\`env
MONGODB_URI=mongodb://localhost:27017/virtual-study-rooms
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
GEMINI_API_KEY=your-gemini-api-key-here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development
\`\`\`

### 4. Set Up MongoDB

#### Option A: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service:
   \`\`\`bash
   # macOS (with Homebrew)
   brew services start mongodb-community
   
   # Ubuntu/Debian
   sudo systemctl start mongod
   
   # Windows
   net start MongoDB
   \`\`\`

#### Option B: MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string and update `MONGODB_URI` in `.env.local`

### 5. Get Google Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to `GEMINI_API_KEY` in `.env.local`

### 6. Create Uploads Directory
\`\`\`bash
mkdir -p public/uploads
\`\`\`

### 7. Run the Development Server
\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

\`\`\`
virtual-study-rooms/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard page
│   ├── rooms/             # Study room pages
│   └── ai-assistant/      # AI assistant page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── video-chat.tsx    # Video chat component
│   ├── collaborative-whiteboard.tsx
│   ├── file-sharing.tsx
│   └── ...
├── lib/                   # Utility functions
│   ├── mongodb.ts        # Database connection
│   └── auth.ts           # Authentication helpers
├── models/               # MongoDB models
│   ├── User.ts
│   ├── StudyRoom.ts
│   └── ...
├── public/               # Static files
│   └── uploads/          # File uploads directory
└── ...config files
\`\`\`

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `NEXT_PUBLIC_SITE_URL` | App URL for Socket.io | Yes |
| `NODE_ENV` | Environment (development/production) | Yes |

### MongoDB Setup

The app will automatically create the necessary collections and indexes when you first run it. No manual database setup required.

### File Storage

By default, files are stored in `public/uploads/`. For production, consider using:
- AWS S3
- Google Cloud Storage
- Cloudinary

## 🎮 Usage

### Creating a Study Room
1. Sign up or log in
2. Click "Create Room" from dashboard
3. Fill in room details (name, subject, type)
4. Invite friends or make it public

### Joining a Study Room
1. Browse active rooms on dashboard
2. Click "Join Room" on any available room
3. Or enter a room code for private rooms

### Using Features
- **Video Chat**: Automatic when joining room
- **Whiteboard**: Click whiteboard tab, start drawing
- **File Sharing**: Drag files into the files tab
- **Notes**: Create collaborative notes in notes tab
- **Timer**: Host can start synchronized study timer
- **AI Assistant**: Access from sidebar or dedicated page

## 🚀 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Manual Deployment
1. Build the project:
   \`\`\`bash
   npm run build
   \`\`\`
2. Start production server:
   \`\`\`bash
   npm start
   \`\`\`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 API Documentation

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login user

### Rooms
- `GET /api/rooms` - Get all active rooms
- `POST /api/rooms` - Create new room
- `GET /api/rooms/[id]` - Get room details
- `POST /api/rooms/[id]/leave` - Leave room and save session

### Files
- `POST /api/upload` - Upload file
- `GET /api/rooms/[id]/files` - Get room files
- `POST /api/rooms/[id]/files` - Save file metadata

### AI
- `POST /api/ai/chat` - Chat with AI assistant
- `POST /api/ai/analyze-material` - Analyze study material
- `POST /api/ai/study-recommendations` - Get personalized recommendations

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Error**
- Ensure MongoDB is running
- Check connection string in `.env.local`
- Verify network access for MongoDB Atlas

**Video Chat Not Working**
- Check browser permissions for camera/microphone
- Ensure HTTPS in production (WebRTC requirement)
- Configure STUN/TURN servers for production

**File Upload Fails**
- Check `public/uploads` directory exists
- Verify file size limits (10MB default)
- Ensure proper permissions on uploads directory

**Socket.io Connection Issues**
- Verify `NEXT_PUBLIC_SITE_URL` is correct
- Check firewall settings
- Ensure WebSocket support

### Performance Tips

- Use MongoDB indexes for better query performance
- Implement file compression for uploads
- Add CDN for static assets
- Use Redis for session storage in production

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 PANDA Hacks 2025

This project was created for PANDA Hacks 2025, focusing on:
- **Agentic AI Track**: Advanced AI integration with personalized assistance
- **Student Impact**: Solving real problems in remote learning
- **Innovation**: Combining multiple technologies for seamless collaboration
- **Accessibility**: Designed for high school students with intuitive UX

## 📞 Support

For support, email [your-email] or create an issue in the repository.

---

**Built with ❤️ for PANDA Hacks 2025**
#   V - c l a s s r o o m  
 