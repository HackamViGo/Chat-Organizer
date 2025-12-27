#!/bin/bash
# Script to ensure Node.js 20.19.0 is used system-wide

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use Node.js 20.19.0
nvm use 20.19.0

# Create a symlink in a directory that's early in PATH (if needed)
# Or update shell config to prioritize nvm

echo "Node.js version: $(node --version)"
echo "Node.js path: $(which node)"


