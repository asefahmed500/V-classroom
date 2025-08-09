const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import the Room model
const Room = require('../models/Room');

async function createDemoRoom() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if demo room already exists
    const existingRoom = await Room.findOne({ roomId: 'RH5BSC' });
    if (existingRoom) {
      console.log('Demo room RH5BSC already exists');
      return;
    }

    // Create demo room
    const demoRoom = new Room({
      roomId: 'RH5BSC',
      name: 'Demo Study Room',
      subject: 'General Studies',
      description: 'A demo room for testing the application',
      createdBy: 'demo_user',
      createdAt: new Date(),
      isActive: true,
      maxParticipants: 8,
      privacy: 'public',
      participants: [],
      settings: {
        allowScreenShare: true,
        allowFileShare: true,
        allowChat: true,
        allowWhiteboard: true,
        allowNotes: true
      },
      whiteboardData: [],
      timerState: {
        isRunning: false,
        timeLeft: 1500,
        mode: 'work',
        session: 1
      },
      lastActivity: new Date()
    });

    await demoRoom.save();
    console.log('Demo room RH5BSC created successfully');

  } catch (error) {
    console.error('Error creating demo room:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createDemoRoom();