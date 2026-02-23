#!/bin/bash
# Quick test script for Monster Generation API

set -e

echo "🎲 Monster Generation API Test Script"
echo "======================================"
echo ""

# Configuration
API_URL="http://localhost:3001"
EMAIL="${TEST_EMAIL:-testgm@test.com}"
PASSWORD="${TEST_PASSWORD:-password123}"

# Step 1: Login
echo "1️⃣  Logging in..."
TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Make sure you have a user account."
  echo "   Create one with: make test-api"
  exit 1
fi

echo "✅ Logged in successfully"
echo ""

# Step 2: Get or create a test campaign
echo "2️⃣  Finding test campaign..."
CAMPAIGNS=$(curl -s -X GET "$API_URL/api/campaigns" \
  -H "Authorization: Bearer $TOKEN")

CAMPAIGN_ID=$(echo "$CAMPAIGNS" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if len(data) > 0:
        print(data[0]['id'])
except:
    pass
" 2>/dev/null)

if [ -z "$CAMPAIGN_ID" ]; then
  echo "   No campaigns found. Creating test campaign..."
  CAMPAIGN_ID=$(curl -s -X POST "$API_URL/api/campaigns" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Monster Test Campaign",
      "setting": "Dark Fantasy Forest",
      "theme": "Adventure",
      "tone": "Balanced",
      "playerCount": 4
    }' | python3 -c "import sys,json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)
fi

echo "✅ Using campaign: $CAMPAIGN_ID"
echo ""

# Step 3: Generate monsters
echo "3️⃣  Generating 3 goblins (CR 1/4)..."
RESULT=$(curl -s -X POST "$API_URL/api/generate/campaigns/$CAMPAIGN_ID/monsters" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "monsterType": "goblin warrior",
    "cr": 0.25,
    "count": 3
  }')

echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"
echo ""

# Step 4: Get monster IDs
echo "4️⃣  Extracting monster IDs..."
MONSTER_IDS=$(echo "$RESULT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for m in data.get('monsters', []):
        print(m['id'])
except Exception as e:
    print(f'Error: {e}', file=sys.stderr)
" 2>/dev/null)

if [ -z "$MONSTER_IDS" ]; then
  echo "❌ No monsters generated. Check the API response above."
  exit 1
fi

echo "✅ Generated monsters:"
echo "$MONSTER_IDS"
echo ""

# Step 5: Sync to Foundry (optional)
echo "5️⃣  Do you want to sync these monsters to Foundry VTT? (y/n)"
read -r SYNC_CHOICE

if [ "$SYNC_CHOICE" = "y" ] || [ "$SYNC_CHOICE" = "Y" ]; then
  echo "   Syncing to Foundry..."

  for MONSTER_ID in $MONSTER_IDS; do
    echo "   → Syncing monster $MONSTER_ID..."
    curl -s -X POST "$API_URL/api/foundry/actors/$MONSTER_ID" \
      -H "Authorization: Bearer $TOKEN" \
      | python3 -m json.tool 2>/dev/null
  done

  echo ""
  echo "✅ Monsters synced to Foundry!"
  echo "   Check http://localhost:30000 → Actors tab"
else
  echo "   Skipped Foundry sync"
fi

echo ""
echo "======================================"
echo "✨ Test complete!"
echo ""
echo "💡 Try other monster types:"
echo "   - \"zombie\" (CR 0.25)"
echo "   - \"bandit\" (CR 0.125)"
echo "   - \"ogre\" (CR 2)"
echo "   - \"vampire lord\" (CR 13)"
echo ""
echo "📖 Full documentation: docs/MONSTER_GENERATION_API.md"
