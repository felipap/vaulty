#!/bin/sh
set -e

echo "Pushing database schema..."
npx drizzle-kit push --force
echo "Schema pushed successfully."

echo "Starting server..."
exec node server.js
