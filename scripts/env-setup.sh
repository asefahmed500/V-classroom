#!/bin/bash

# Virtual Study Rooms - Environment Setup Script
# This script helps set up environment variables for the project

set -e

echo "🚀 Virtual Study Rooms - Environment Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  .env.local already exists!${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}ℹ️  Keeping existing .env.local file${NC}"
        exit 0
    fi
fi

# Copy template
echo -e "${BLUE}📋 Copying .env.example to .env.local...${NC}"
cp .env.example .env.local

# Generate secure secrets
echo -e "${BLUE}🔐 Generating secure secrets...${NC}"

# Generate JWT secret (64 characters)
JWT_SECRET=$(openssl rand -hex 32)
sed -i.bak "s/your-super-secret-jwt-key-change-this-in-production-min-32-chars/$JWT_SECRET/" .env.local

# Generate session secret (32 characters)
SESSION_SECRET=$(openssl rand -hex 16)
sed -i.bak "s/your-session-secret-key/$SESSION_SECRET/" .env.local

# Generate webhook secret (32 characters)
WEBHOOK_SECRET=$(openssl rand -hex 16)
sed -i.bak "s/your-webhook-secret/$WEBHOOK_SECRET/" .env.local

# Generate Redis password (16 characters)
REDIS_PASSWORD=$(openssl rand -hex 8)
sed -i.bak "s/your-redis-password/$REDIS_PASSWORD/" .env.local

# Generate MongoDB password (16 characters)
MONGO_PASSWORD=$(openssl rand -hex 8)
sed -i.bak "s/your-secure-password/$MONGO_PASSWORD/" .env.local

# Clean up backup files
rm -f .env.local.bak

echo -e "${GREEN}✅ Environment file created successfully!${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Edit .env.local and add your API keys:"
echo "   - GOOGLE_AI_API_KEY (get from: https://makersuite.google.com/app/apikey)"
echo "   - SMTP credentials (if using email features)"
echo "   - NEXT_PUBLIC_SITE_URL (your domain for production)"
echo ""
echo "2. Start MongoDB (if using local instance):"
echo "   docker-compose up mongodb -d"
echo ""
echo "3. Install dependencies:"
echo "   npm install"
echo ""
echo "4. Run the application:"
echo "   npm run dev"
echo ""
echo -e "${GREEN}🎉 Setup complete! Happy coding!${NC}"

# Show important environment variables that need manual configuration
echo ""
echo -e "${YELLOW}⚠️  Important: Please configure these manually in .env.local:${NC}"
echo "   - GOOGLE_AI_API_KEY=your-actual-gemini-api-key"
echo "   - SMTP_USER=your-email@gmail.com"
echo "   - SMTP_PASS=your-gmail-app-password"
echo "   - NEXT_PUBLIC_SITE_URL=https://yourdomain.com (for production)"
