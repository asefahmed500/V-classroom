#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

console.log("🧪 Virtual Study Rooms - System Test")
console.log("===================================")

// Check environment setup
console.log("\n1. Environment Setup:")
const envPath = path.join(__dirname, "..", ".env.local")
if (fs.existsSync(envPath)) {
  console.log("✅ .env.local exists")

  const envContent = fs.readFileSync(envPath, "utf8")
  const requiredVars = ["MONGODB_URI", "JWT_SECRET", "GEMINI_API_KEY", "NEXT_PUBLIC_SITE_URL"]

  requiredVars.forEach((varName) => {
    if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=your-`)) {
      console.log(`✅ ${varName} is set`)
    } else {
      console.log(`❌ ${varName} is missing or not configured`)
    }
  })
} else {
  console.log("❌ .env.local not found")
}

// Check uploads directory
const uploadsDir = path.join(__dirname, "..", "public", "uploads")
if (fs.existsSync(uploadsDir)) {
  console.log("✅ Uploads directory exists")
} else {
  console.log("❌ Uploads directory missing")
}

console.log("\n2. Next Steps:")
console.log("- Start your MongoDB server")
console.log("- Run: npm run dev")
console.log("- Open: http://localhost:3000/api/health")
console.log("- Follow the testing checklist below")
