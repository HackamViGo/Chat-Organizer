#!/bin/bash

# 🎬 DIRECTOR'S CHAIR
# This script runs the Ghost Actor and captures the raw footage.

echo "🎥 LIGHTS. CAMERA. ACTION."

# 1. CLEANUP
rm -rf test-results/
mkdir -p dist/marketing

# 2. ACTION: Run Playwright with Video Recording ON
# We target the specific ghost_actor spec
npx playwright test tests/marketing/ghost_actor.spec.ts --headed --config=playwright.config.ts --output=dist/marketing/raw

# 3. CUT: Find the video file
# Playwright buries it in random folders. We dig it out.
VIDEO_PATH=$(find dist/marketing/raw -name "*.webm" | head -n 1)

if [ -z "$VIDEO_PATH" ]; then
  echo "❌ CUT! No video found. Did the test fail?"
  exit 1
fi

echo "✅ WRAP: Raw footage captured at: $VIDEO_PATH"

# 4. POST-PRODUCTION (Optional - Requires FFmpeg)
if command -v ffmpeg &> /dev/null; then
    echo "🎞️ EDITING: Converting to MP4 and Speeding Up..."
    ffmpeg -y -i "$VIDEO_PATH" -filter:v "setpts=0.8*PTS" -c:v libx264 -crf 20 -preset slow "dist/marketing/FINAL_CUT.mp4"
    echo "✨ PREMIERE READY: dist/marketing/FINAL_CUT.mp4"
else
    echo "⚠️  FFmpeg not found. Raw webm saved. Install ffmpeg for auto-editing."
    cp "$VIDEO_PATH" "dist/marketing/RAW_FOOTAGE.webm"
    echo "📂 File moved to: dist/marketing/RAW_FOOTAGE.webm"
fi
