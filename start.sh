#!/bin/bash

echo "=== DTF Editor Startup Script ==="
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Check if environment variables are set
echo "=== Environment Variables ==="
echo "PORT: ${PORT:-'not set'}"
echo "NODE_ENV: ${NODE_ENV:-'not set'}"
echo "STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:+'set'}"
echo "VECTORIZER_API_ID: ${VECTORIZER_API_ID:+'set'}"
echo "CLIPPING_MAGIC_API_ID: ${CLIPPING_MAGIC_API_ID:+'set'}"

# Set default PORT if not set
if [ -z "$PORT" ]; then
    echo "Warning: PORT environment variable not set, using default 3000"
    export PORT=3000
fi

# Check if server.js exists
if [ ! -f "server.js" ]; then
    echo "ERROR: server.js not found!"
    ls -la
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "ERROR: node_modules not found!"
    exit 1
fi

echo "=== Starting Server ==="
echo "Starting server on port $PORT..."

# Start the server with error handling
node server.js 2>&1 | tee server.log

# If we get here, the server has stopped
echo "Server stopped with exit code: $?"
echo "=== Server Log ==="
cat server.log
