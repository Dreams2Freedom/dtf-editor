#!/bin/bash

echo "Starting DTF Editor server..."

# Check if environment variables are set
if [ -z "$PORT" ]; then
    echo "Warning: PORT environment variable not set, using default 3000"
    export PORT=3000
fi

# Start the server
echo "Starting server on port $PORT..."
node server.js
