#!/bin/bash

# Make all scripts executable
echo "🔧 Making all scripts executable..."

# Make this script executable first
chmod +x "$0"

# Make all .sh files in the scripts directory executable
find . -name "*.sh" -type f -exec chmod +x {} \;

echo "✅ All scripts are now executable!"
echo ""
echo "Available scripts:"
echo "  📁 scripts/setup-github.sh      - Set up GitHub repository"
echo "  🧹 scripts/cleanup-aws.sh       - Full AWS cleanup (infrastructure + data)"
echo "  🧹 scripts/cleanup-data-only.sh - Data-only cleanup (preserves infrastructure)"
echo "  🔧 scripts/make-executable.sh   - This script"
echo ""
echo "You can now run any of these scripts directly."


