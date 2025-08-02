#!/bin/bash

echo "🔨 Building Virtual Study Rooms Project"
echo "======================================"

# Check Node.js version
echo "📋 Checking Node.js version..."
node --version

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Type check
echo "🔍 Running TypeScript type check..."
npx tsc --noEmit

# Lint check
echo "🧹 Running ESLint..."
npx next lint

# Build the project
echo "🏗️ Building the project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🚀 Ready to run:"
    echo "   npm run dev    # Development server"
    echo "   npm start      # Production server"
else
    echo "❌ Build failed!"
    echo ""
    echo "🔧 Common fixes:"
    echo "   1. Check TypeScript errors above"
    echo "   2. Verify all dependencies are installed"
    echo "   3. Check environment variables"
    echo "   4. Review import statements"
fi
