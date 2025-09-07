#!/bin/bash

# Convoso Integration Test Scripts
# Make this file executable: chmod +x test-convoso-integration.sh

echo "🚀 Testing Convoso Integration"
echo "================================"

# Base URL - Update this for your environment
BASE_URL="${BASE_URL:-http://localhost:3000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Agency Onboarding
echo -e "\n${YELLOW}Test 1: Agency Onboarding${NC}"
echo "Enter your Convoso auth token:"
read -r CONVOSO_TOKEN

if [ -z "$CONVOSO_TOKEN" ]; then
    echo -e "${RED}❌ Convoso token is required${NC}"
    exit 1
fi

echo "Testing agency onboarding..."
ONBOARD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/onboard-agency" \
  -H 'Content-Type: application/json' \
  -d "{
    \"agency_name\": \"TEST_AGENCY_$(date +%s)\",
    \"convoso_token\": \"$CONVOSO_TOKEN\"
  }")

echo "Response: $ONBOARD_RESPONSE"

# Extract agency ID for next tests
AGENCY_ID=$(echo "$ONBOARD_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$AGENCY_ID" ]; then
    echo -e "${RED}❌ Failed to extract agency ID from response${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Agency onboarded successfully. ID: $AGENCY_ID${NC}"

# Test 2: Lead Insertion
echo -e "\n${YELLOW}Test 2: Lead Insertion${NC}"
echo "Testing lead insertion..."

LEAD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/convoso/smart-lead-insert" \
  -H 'Content-Type: application/json' \
  -d "{
    \"agency_id\": \"$AGENCY_ID\",
    \"lead_data\": {
      \"phone\": \"818-555-$(shuf -i 1000-9999 -n 1)\",
      \"first_name\": \"Test\",
      \"last_name\": \"Lead\",
      \"email\": \"test@example.com\",
      \"currently_insured\": \"Yes\",
      \"household_income\": 50000,
      \"state\": \"CA\",
      \"city\": \"Los Angeles\",
      \"zip\": \"90210\"
    }
  }")

echo "Response: $LEAD_RESPONSE"

if echo "$LEAD_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Lead inserted successfully${NC}"
else
    echo -e "${RED}❌ Lead insertion failed${NC}"
fi

# Test 3: Invalid Data Handling
echo -e "\n${YELLOW}Test 3: Invalid Data Handling${NC}"
echo "Testing error handling with invalid phone..."

INVALID_RESPONSE=$(curl -s -X POST "$BASE_URL/api/convoso/smart-lead-insert" \
  -H 'Content-Type: application/json' \
  -d "{
    \"agency_id\": \"$AGENCY_ID\",
    \"lead_data\": {
      \"phone\": \"123\",
      \"first_name\": \"Invalid\",
      \"last_name\": \"Lead\"
    }
  }")

if echo "$INVALID_RESPONSE" | grep -q '"error"'; then
    echo -e "${GREEN}✅ Error handling working correctly${NC}"
else
    echo -e "${RED}❌ Error handling not working${NC}"
fi

echo "Response: $INVALID_RESPONSE"

# Test 4: Duplicate Lead Handling
echo -e "\n${YELLOW}Test 4: Duplicate Lead Handling${NC}"
echo "Testing duplicate lead insertion..."

DUPLICATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/convoso/smart-lead-insert" \
  -H 'Content-Type: application/json' \
  -d "{
    \"agency_id\": \"$AGENCY_ID\",
    \"lead_data\": {
      \"phone\": \"818-555-1234\",
      \"first_name\": \"Duplicate\",
      \"last_name\": \"Lead\"
    }
  }")

echo "Response: $DUPLICATE_RESPONSE"

echo -e "\n${GREEN}🎉 Integration testing completed!${NC}"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Check your Supabase database for the created records"
echo "2. Verify the leads appear in your Convoso account"
echo "3. Test the webhook endpoint if configured"
echo "4. Set up your production environment variables"