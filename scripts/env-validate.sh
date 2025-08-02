#!/bin/bash

# Virtual Study Rooms - Environment Validation Script
# This script validates that all required environment variables are set

set -e

echo "🔍 Virtual Study Rooms - Environment Validation"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local file not found!${NC}"
    echo -e "${BLUE}💡 Run: ./scripts/env-setup.sh${NC}"
    exit 1
fi

# Load environment variables
set -a
source .env.local
set +a

# Validation functions
validate_required() {
    local var_name=$1
    local var_value=${!var_name}
    
    if [ -z "$var_value" ]; then
        echo -e "${RED}❌ $var_name is required but not set${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $var_name${NC}"
        return 0
    fi
}

validate_optional() {
    local var_name=$1
    local var_value=${!var_name}
    
    if [ -z "$var_value" ]; then
        echo -e "${YELLOW}⚠️  $var_name is optional but not set${NC}"
        return 0
    else
        echo -e "${GREEN}✅ $var_name${NC}"
        return 0
    fi
}

validate_url() {
    local var_name=$1
    local var_value=${!var_name}
    
    if [[ $var_value =~ ^https?:// ]]; then
        echo -e "${GREEN}✅ $var_name (valid URL)${NC}"
        return 0
    else
        echo -e "${RED}❌ $var_name is not a valid URL${NC}"
        return 1
    fi
}

validate_number() {
    local var_name=$1
    local var_value=${!var_name}
    
    if [[ $var_value =~ ^[0-9]+$ ]]; then
        echo -e "${GREEN}✅ $var_name (valid number)${NC}"
        return 0
    else
        echo -e "${RED}❌ $var_name is not a valid number${NC}"
        return 1
    fi
}

# Start validation
echo -e "${BLUE}🔍 Validating required variables...${NC}"
ERRORS=0

# Required variables
validate_required "MONGODB_URI" || ((ERRORS++))
validate_required "JWT_SECRET" || ((ERRORS++))
validate_required "NODE_ENV" || ((ERRORS++))

# URL validations
validate_url "NEXT_PUBLIC_SITE_URL" || ((ERRORS++))

# Number validations
validate_number "SOCKET_PORT" || ((ERRORS++))
validate_number "UPLOAD_MAX_SIZE" || ((ERRORS++))

echo ""
echo -e "${BLUE}🔍 Validating optional variables...${NC}"

# Optional but recommended
validate_optional "GOOGLE_AI_API_KEY"
validate_optional "GEMINI_API_KEY"
validate_optional "SMTP_USER"
validate_optional "SMTP_PASS"
validate_optional "REDIS_URL"

# Check JWT secret length
if [ ${#JWT_SECRET} -lt 32 ]; then
    echo -e "${RED}❌ JWT_SECRET must be at least 32 characters long${NC}"
    ((ERRORS++))
fi

# Check if MongoDB is accessible (if local)
if [[ $MONGODB_URI == *"localhost"* ]]; then
    echo -e "${BLUE}🔍 Checking MongoDB connection...${NC}"
    if command -v mongosh &> /dev/null; then
        if mongosh --eval "db.adminCommand('ping')" "$MONGODB_URI" &> /dev/null; then
            echo -e "${GREEN}✅ MongoDB connection successful${NC}"
        else
            echo -e "${YELLOW}⚠️  MongoDB connection failed (make sure MongoDB is running)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  mongosh not found, skipping MongoDB connection test${NC}"
    fi
fi

# Summary
echo ""
echo "=============================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 All validations passed!${NC}"
    echo -e "${BLUE}💡 You can now run: npm run dev${NC}"
    exit 0
else
    echo -e "${RED}❌ $ERRORS validation error(s) found${NC}"
    echo -e "${BLUE}💡 Please fix the errors above and run this script again${NC}"
    exit 1
fi
