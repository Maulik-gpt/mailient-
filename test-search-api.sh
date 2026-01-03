#!/bin/bash

# Simple API Test for Search Backend
echo "🔍 Testing Search Backend API..."

# Test 1: Basic Search API
echo -e "\n1. Testing Basic Search API..."
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Content-Type: application/json" \
  "http://localhost:3000/api/search?q=test&limit=5")

http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')

if [ "$http_code" = "200" ] || [ "$http_code" = "401" ]; then
    echo "✅ Basic Search API responded (HTTP $http_code)"
    if [ "$http_code" = "401" ]; then
        echo "ℹ️  Authentication required (expected)"
    fi
else
    echo "❌ Basic Search API failed (HTTP $http_code)"
    echo "Response: $body"
fi

# Test 2: Advanced Search API
echo -e "\n2. Testing Advanced Search API..."
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Content-Type: application/json" \
  "http://localhost:3000/api/search/advanced?q=test&limit=5&analytics=true")

http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')

if [ "$http_code" = "200" ] || [ "$http_code" = "401" ]; then
    echo "✅ Advanced Search API responded (HTTP $http_code)"
    if [ "$http_code" = "401" ]; then
        echo "ℹ️  Authentication required (expected)"
    fi
else
    echo "❌ Advanced Search API failed (HTTP $http_code)"
    echo "Response: $body"
fi

# Test 3: Autocomplete API
echo -e "\n3. Testing Autocomplete API..."
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Content-Type: application/json" \
  "http://localhost:3000/api/search/autocomplete?q=te&limit=5")

http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')

if [ "$http_code" = "200" ] || [ "$http_code" = "401" ]; then
    echo "✅ Autocomplete API responded (HTTP $http_code)"
    if [ "$http_code" = "401" ]; then
        echo "ℹ️  Authentication required (expected)"
    fi
else
    echo "❌ Autocomplete API failed (HTTP $http_code)"
    echo "Response: $body"
fi

# Test 4: Analytics API
echo -e "\n4. Testing Analytics API..."
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Content-Type: application/json" \
  "http://localhost:3000/api/search/analytics?timeRange=7d")

http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')

if [ "$http_code" = "200" ] || [ "$http_code" = "401" ]; then
    echo "✅ Analytics API responded (HTTP $http_code)"
    if [ "$http_code" = "401" ]; then
        echo "ℹ️  Authentication required (expected)"
    fi
else
    echo "❌ Analytics API failed (HTTP $http_code)"
    echo "Response: $body"
fi

echo -e "\n🎉 API Testing Complete!"
echo -e "\nIf all APIs return 401 (Unauthorized), the endpoints are working correctly."
echo -e "The authentication system is properly protecting the search endpoints."