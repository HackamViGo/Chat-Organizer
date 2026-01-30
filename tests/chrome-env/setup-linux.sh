#!/bin/bash

# Setup script for Linux
# This script helps set up the project on Linux after migrating from Windows

echo "🚀 Setting up Chat Organizer for Linux..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo "📦 Installing Node.js via nvm (recommended) or system package manager..."
    
    # Try to detect if nvm is installed
    if [ -s "$HOME/.nvm/nvm.sh" ]; then
        echo "✅ Found nvm, using it to install Node.js..."
        source "$HOME/.nvm/nvm.sh"
        nvm install --lts
        nvm use --lts
    else
        echo "⚠️  nvm not found. Please install Node.js manually:"
        echo "   Option 1 (Recommended): Install nvm:"
        echo "   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
        echo ""
        echo "   Option 2: Install via package manager:"
        echo "   Ubuntu/Debian: sudo apt update && sudo apt install nodejs npm"
        echo "   Fedora: sudo dnf install nodejs npm"
        echo "   Arch: sudo pacman -S nodejs npm"
        exit 1
    fi
fi

# Verify Node.js installation
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    echo "✅ Node.js $NODE_VERSION installed"
    echo "✅ npm $NPM_VERSION installed"
else
    echo "❌ Node.js installation failed"
    exit 1
fi

# Install dependencies
echo ""
echo "📦 Installing project dependencies..."
npm install

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo ""
    echo "⚠️  .env.local not found. Creating from .env.local.example..."
    if [ -f .env.local.example ]; then
        cp .env.local.example .env.local
        echo "✅ Created .env.local. Please update it with your configuration."
    else
        echo "⚠️  .env.local.example not found. You may need to create .env.local manually."
    fi
fi

# Set proper permissions for scripts
echo ""
echo "🔧 Setting up file permissions..."
find . -name "*.sh" -type f -exec chmod +x {} \; 2>/dev/null || true

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env.local with your configuration (Supabase keys, etc.)"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Run 'npm run build' to build for production"

