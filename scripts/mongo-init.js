// MongoDB initialization script for Docker
const db = db.getSiblingDB("virtual-study-rooms")

// Create collections
db.createCollection("users")
db.createCollection("studyrooms")
db.createCollection("roomfiles")
db.createCollection("roomnotes")
db.createCollection("whiteboarddatas")
db.createCollection("studysessions")

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true })
db.studyrooms.createIndex({ isActive: 1 })
db.studyrooms.createIndex({ subject: 1 })
db.studyrooms.createIndex({ createdAt: -1 })
db.roomfiles.createIndex({ roomId: 1 })
db.roomnotes.createIndex({ roomId: 1 })
db.whiteboarddatas.createIndex({ roomId: 1 }, { unique: true })
db.studysessions.createIndex({ userId: 1 })
db.studysessions.createIndex({ createdAt: -1 })

print("Database initialized successfully!")
