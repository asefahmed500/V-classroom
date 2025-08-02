#!/bin/bash

echo "🚀 Final Build Test - Virtual Study Rooms"
echo "========================================"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Type check
echo "🔍 Running TypeScript type check..."
npm run type-check

if [ $? -ne 0 ]; then
    echo "❌ TypeScript errors found!"
    exit 1
fi

# Build the project
echo "🏗️ Building the project..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ BUILD SUCCESSFUL!"
    echo ""
    echo "🎉 Your Virtual Study Rooms project is ready!"
    echo ""
    echo "Next steps:"
    echo "1. Set up your environment variables in .env.local"
    echo "2. Start MongoDB: brew services start mongodb-community"
    echo "3. Run the development server: npm run dev"
    echo "4. Visit http://localhost:3000"
    echo ""
    echo "For testing:"
    echo "- Health check: http://localhost:3000/api/health"
    echo "- Test dashboard: http://localhost:3000/test"
else
    echo ""
    echo "❌ BUILD FAILED!"
    echo ""
    echo "Common fixes:"
    echo "1. Check the error messages above"
    echo "2. Ensure all dependencies are installed"
    echo "3. Verify TypeScript configuration"
    echo "4. Check for missing imports or exports"
fi
