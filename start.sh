#!/bin/bash
echo "Starting DTF Editor server..."
echo "Environment variables:"
echo "PORT: $PORT"
echo "NODE_ENV: $NODE_ENV"
echo "DB_HOST: $DB_HOST"
echo "DB_PORT: $DB_PORT"
echo "DB_NAME: $DB_NAME"
echo "DB_USER: $DB_USER"
echo "JWT_SECRET: ${JWT_SECRET:0:10}..."

# Wait a moment for database to be ready
sleep 2

# Start the server
node server.js
