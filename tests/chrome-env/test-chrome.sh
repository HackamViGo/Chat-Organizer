#!/bin/bash
# Chrome Extension Test Environment
# Auto-generated and AI-managed

set -e

ORIGINAL="$HOME/.config/google-chrome/Default"
TESTDIR="/tmp/chrome-extension-test-$(date +%s)"
LOG_FILE="$TESTDIR/test.log"

echo "🧪 Chrome Extension Test Environment"
echo "======================================"
echo ""

# Proactive cleanup of orphaned test profiles
echo "🧹 Cleaning up orphaned test profiles..."
rm -rf /tmp/chrome-extension-test-*

# Check if Chrome is running (would lock Cookies file)
if pgrep -x "chrome\|chromium" > /dev/null; then
    echo "⚠️  Warning: Chrome/Chromium is running!"
    echo "   Cookies file may be locked. Consider closing Chrome first."
    echo "   Continuing anyway..."
    echo ""
fi

# Check if original profile exists
if [ ! -d "$ORIGINAL" ]; then
    echo "❌ Error: Chrome profile not found at $ORIGINAL"
    echo "💡 Trying alternative locations..."
    
    # Try alternative locations
    if [ -d "$HOME/.config/chromium/Default" ]; then
        ORIGINAL="$HOME/.config/chromium/Default"
        echo "✅ Found Chromium profile: $ORIGINAL"
    elif [ -d "$HOME/snap/chromium/common/chromium/Default" ]; then
        ORIGINAL="$HOME/snap/chromium/common/chromium/Default"
        echo "✅ Found Chromium snap profile: $ORIGINAL"
    else
        echo "❌ Chrome profile not found. Please specify manually:"
        echo "   export CHROME_PROFILE=/path/to/profile"
        exit 1
    fi
fi

# Create test directory
echo "📁 Creating isolated test profile..."
mkdir -p "$TESTDIR"

# Copy profile (with login, but fresh storage)
echo "📋 Copying profile (this may take a moment)..."
if cp -r "$ORIGINAL" "$TESTDIR/" 2>/dev/null; then
    echo "✅ Full profile copied"
else
    echo "⚠️  Full copy failed, creating minimal profile with auth data..."
    mkdir -p "$TESTDIR/Default"
    
    # Copy essential files for authentication
    echo "   Copying Preferences..."
    cp "$ORIGINAL/Preferences" "$TESTDIR/Default/" 2>/dev/null || true
    
    echo "   Copying Cookies (for Supabase/Vercel auth)..."
    # Try to copy Cookies file (may fail if Chrome is running)
    if cp "$ORIGINAL/Cookies" "$TESTDIR/Default/" 2>/dev/null; then
        echo "   ✅ Cookies copied successfully"
    else
        echo "   ⚠️  Cookies file locked (Chrome may be running)"
        echo "   💡 Close Chrome and try again, or login manually in test browser"
    fi
    
    cp "$ORIGINAL/Cookies-journal" "$TESTDIR/Default/" 2>/dev/null || true
    cp "$ORIGINAL/Login Data" "$TESTDIR/Default/" 2>/dev/null || true
    cp "$ORIGINAL/Login Data-journal" "$TESTDIR/Default/" 2>/dev/null || true
    cp "$ORIGINAL/Web Data" "$TESTDIR/Default/" 2>/dev/null || true
fi

# Clean storage to prevent contamination (but keep cookies for auth)
echo "🧹 Cleaning storage databases (keeping cookies for authentication)..."
rm -rf "$TESTDIR/Default/IndexedDB" 2>/dev/null || true
rm -rf "$TESTDIR/Default/Local Storage" 2>/dev/null || true
rm -rf "$TESTDIR/Default/Session Storage" 2>/dev/null || true
rm -rf "$TESTDIR/Default/databases" 2>/dev/null || true
rm -rf "$TESTDIR/Default/Service Worker" 2>/dev/null || true

# IMPORTANT: Keep cookies for Supabase/Vercel authentication
# Cookies file contains HTTP-only cookies needed for login
echo "✅ Cookies preserved for authentication"

echo ""
echo "✅ Test environment ready!"
echo "📍 Profile location: $TESTDIR"
echo ""
echo "🚀 Starting Chrome..."
echo "   - Your Google account: LOGGED IN (if cookies copied)"
echo "   - Vercel/Supabase: LOGIN REQUIRED (cookies may need refresh)"
echo "   - IndexedDB: CLEAN & READY"
echo ""
echo "💡 If not logged into Vercel:"
echo "   1. Go to ${DASHBOARD_URL:-http://localhost:3000}/auth/signin"
echo "   2. Login with your credentials"
echo "   3. Cookies will be saved for next time"
echo ""
echo "⚠️  Close Chrome when done to auto-cleanup"
echo ""

# Detect Chrome binary
CHROME_BIN="google-chrome"
if ! command -v "$CHROME_BIN" &> /dev/null; then
    CHROME_BIN="chromium"
    if ! command -v "$CHROME_BIN" &> /dev/null; then
        echo "❌ Chrome/Chromium not found in PATH"
        exit 1
    fi
fi

# Start Chrome
"$CHROME_BIN" --user-data-dir="$TESTDIR" > "$LOG_FILE" 2>&1 &
CHROME_PID=$!

echo "Chrome PID: $CHROME_PID"
echo "Log file: $LOG_FILE"
echo ""

# Wait for Chrome to close
wait $CHROME_PID || true

# Cleanup
echo ""
echo "🧹 Cleaning up test environment..."
rm -rf "$TESTDIR"

echo "✅ Test completed! Original profile untouched."
echo ""

