#!/bin/bash

# Configuration
BASE_URL="http://localhost:3001"
# Test the public properties endpoint
echo "1. Testing GET /api/properties..."
HTTP_STATUS=$(curl -s -o response.json -w "%{http_code}" "$BASE_URL/api/properties")
echo "Status: $HTTP_STATUS"
if [ "$HTTP_STATUS" -ne 200 ]; then
  echo "❌ GET /api/properties failed"
  cat response.json
  exit 1
fi
echo "✅ GET /api/properties succeeded"

# Test the single property endpoint
echo -e "\n2. Testing GET /api/properties/evercrest-grand..."
HTTP_STATUS=$(curl -s -o response.json -w "%{http_code}" "$BASE_URL/api/properties/evercrest-grand")
echo "Status: $HTTP_STATUS"
if [ "$HTTP_STATUS" -ne 200 ]; then
  echo "❌ GET /api/properties/evercrest-grand failed"
  cat response.json
  exit 1
fi
echo "✅ GET /api/properties/evercrest-grand succeeded"

# Test rate limiting middleware
echo -e "\n3. Testing Rate Limiter (Hitting /api/properties 110 times rapidly)..."
# In rate-limit.ts, limit is usually 100 requests per window.
for i in {1..110}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/properties")
  if [ "$STATUS" -eq 429 ]; then
    echo "✅ Rate limiting worked! Got 429 on request #$i"
    exit 0
  fi
done

echo "❌ Rate limiting did NOT trigger after 110 requests."
exit 1
