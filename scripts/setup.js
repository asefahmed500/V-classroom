#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

console.log("🚀 Setting up Virtual Study Rooms...\n")

// Create uploads directory
const uploadsDir = path.join(__dirname, "..", "public", "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
  console.log("✅ Created uploads directory")
} else {
  console.log("✅ Uploads directory already exists")
}

// Check if .env.local exists
const envPath = path.join(__dirname, "..", ".env.local")
if (!fs.existsSync(envPath)) {
  const envExamplePath = path.join(__dirname, "..", ".env.example")
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath)
    console.log("✅ Created .env.local from .env.example")
    console.log("⚠️  Please update .env.local with your actual values")
  } else {
    console.log("❌ .env.example not found")
  }
} else {
  console.log("✅ .env.local already exists")
}

console.log("\n🎉 Setup complete!")
console.log("\nNext steps:")
console.log("1. Update .env.local with your MongoDB URI and API keys")
console.log("2. Install dependencies: npm install")
console.log("3. Start development server: npm run dev")
console.log("\nFor detailed setup instructions, see README.md")
