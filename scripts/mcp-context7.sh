#!/bin/bash
# Load environment variables from the project root .env.local
ENV_FILE="/home/stefanov/Projects/In Progress/Chat Organizer Cursor/.env.local"
if [ -f "$ENV_FILE" ]; then
  # Use grep/sed to extract the key
  API_KEY=$(grep "^CONTEXT7_API_KEY=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '\r' | tr -d '"' | tr -d "'")
  export CONTEXT7_API_KEY=$API_KEY
fi

if [ -z "$CONTEXT7_API_KEY" ]; then
  echo "Error: CONTEXT7_API_KEY not found in $ENV_FILE or environment" >&2
  exit 1
fi

# Run the MCP server with explicit flag
exec npx @upstash/context7-mcp --api-key "$CONTEXT7_API_KEY" "$@"
