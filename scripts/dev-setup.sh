#!/bin/bash

echo "🚀 Virtual Study Rooms - Development Setup"
echo "=========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js v18 or higher."
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if MongoDB is running (local)
if command -v mongod &> /dev/null; then
    if pgrep -x "mongod" > /dev/null; then
        echo "✅ MongoDB is running locally"
    else
        echo "⚠️  MongoDB is installed but not running"
        echo "   Start it with: brew services start mongodb-community (macOS)"
        echo "   Or: sudo systemctl start mongod (Linux)"
    fi
else
    echo "⚠️  MongoDB not found locally - you can use MongoDB Atlas instead"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run setup script
echo "🔧 Running setup script..."
node scripts/setup.js

# Check environment file
if [ -f ".env.local" ]; then
    echo "✅ Environment file created"
    echo "⚠️  Please update .env.local with your actual values:"
    echo "   - MongoDB URI"
    echo "   - Gemini API key"
    echo "   - JWT secret"
else
    echo "❌ Failed to create .env.local"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your actual values"
echo "2. Get Gemini API key from: https://makersuite.google.com/app/apikey"
echo "3. Start development server: npm run dev"
echo ""
echo "For detailed instructions, see README.md"
