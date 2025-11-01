#!/bin/bash

# Wealth Development Environment Setup
# Starts Supabase and Next.js dev server concurrently

set -e

echo "🚀 Starting Wealth development environment..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker Desktop and try again."
  exit 1
fi

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "👋 Shutting down..."
  kill 0
}

trap cleanup EXIT INT TERM

# Start Supabase in background
echo "📦 Starting Supabase..."
npm run db:local &
SUPABASE_PID=$!

# Wait for Supabase to be ready
echo "⏳ Waiting for Supabase to be ready..."
sleep 10

# Check if Supabase is running
if ! npx supabase status > /dev/null 2>&1; then
  echo "❌ Supabase failed to start. Check Docker and try again."
  exit 1
fi

echo "✅ Supabase is ready!"
echo ""
echo "📋 Supabase services:"
echo "   - API: http://localhost:54421"
echo "   - Studio: http://localhost:54423"
echo "   - Inbucket (emails): http://localhost:54424"
echo "   - Database: postgresql://postgres:postgres@localhost:54432/postgres"
echo ""

# Start Next.js dev server
echo "🎨 Starting Next.js dev server..."
npm run dev

# Wait for all background processes
wait
