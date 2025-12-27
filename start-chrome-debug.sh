#!/bin/bash
# Start Chrome in Remote Debugging Mode
# This allows the cursor-chrome-composer.js script to connect and monitor console/network

set -e

# Configuration
DEBUG_PORT=${CHROME_DEBUG_PORT:-9222}
# Use a separate profile but not guest mode
USER_DATA_DIR="${HOME}/.chrome-debug-profile"
# Or use your regular Chrome profile (uncomment next line and comment USER_DATA_DIR above)
# USER_DATA_DIR="${HOME}/.config/google-chrome"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Chrome in Remote Debugging Mode...${NC}"
echo -e "${BLUE}Debug port: ${DEBUG_PORT}${NC}"
echo -e "${BLUE}User data dir: ${USER_DATA_DIR}${NC}"
echo ""

# Check if Chrome/Chromium is installed
if command -v google-chrome &> /dev/null; then
    CHROME_CMD="google-chrome"
elif command -v chromium-browser &> /dev/null; then
    CHROME_CMD="chromium-browser"
elif command -v chromium &> /dev/null; then
    CHROME_CMD="chromium"
else
    echo -e "${RED}❌ Error: Chrome/Chromium not found!${NC}"
    echo "Please install Chrome or Chromium first."
    exit 1
fi

# Create user data directory if it doesn't exist
mkdir -p "${USER_DATA_DIR}"

# Kill any existing Chrome instances on this port (optional)
# Uncomment if you want to kill existing instances:
# pkill -f "remote-debugging-port=${DEBUG_PORT}" || true

# Start Chrome with remote debugging
echo -e "${GREEN}✅ Starting Chrome...${NC}"
echo -e "${YELLOW}Note: Chrome will open in a new window.${NC}"
echo -e "${YELLOW}You can now run: node cursor-chrome-composer.js${NC}"
echo ""

exec "${CHROME_CMD}" \
    --remote-debugging-port="${DEBUG_PORT}" \
    --user-data-dir="${USER_DATA_DIR}" \
    --disable-web-security \
    --disable-features=IsolateOrigins,site-per-process \
    --no-first-run \
    --no-default-browser-check \
    --disable-default-apps \
    "$@" \
    > /dev/null 2>&1 &

CHROME_PID=$!

echo -e "${GREEN}✅ Chrome started with PID: ${CHROME_PID}${NC}"
echo -e "${BLUE}To stop Chrome, run: kill ${CHROME_PID}${NC}"
echo ""

# Wait a moment for Chrome to start
sleep 2

# Check if Chrome is running
if ps -p $CHROME_PID > /dev/null; then
    echo -e "${GREEN}✅ Chrome is running successfully!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "  1. Open a new terminal"
    echo "  2. Run: node cursor-chrome-composer.js"
    echo "  3. Navigate to your website in Chrome"
    echo "  4. Watch console logs and network activity in real-time"
    echo ""
else
    echo -e "${RED}❌ Chrome failed to start!${NC}"
    exit 1
fi

