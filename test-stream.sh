#!/bin/bash
# Test script for SSE streaming route
# Usage: ./test-stream.sh <sessionId> <message>

SESSION_ID="${1:-test-session-id}"
MESSAGE="${2:-Hello, how much did I spend this month?}"

echo "Testing SSE streaming route..."
echo "Session ID: $SESSION_ID"
echo "Message: $MESSAGE"
echo ""

curl -N -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\",\"message\":\"$MESSAGE\"}"
