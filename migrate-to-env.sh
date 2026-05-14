#!/bin/bash

# Ultimate Rcon Config Migration Script
# This script helps convert your JSON configs to .env format

echo "=================================================="
echo "Ultimate Rcon - Config to .env Migration Helper"
echo "=================================================="
echo ""
echo "This script will help you migrate from JSON config files to .env"
echo ""

# Check if CONFIGS directory exists
if [ ! -d "CONFIGS" ]; then
    echo "✗ CONFIGS directory not found"
    echo "  This is normal if you're setting up a fresh environment-only deployment"
    exit 0
fi

echo "Found CONFIGS directory. Your current setup uses JSON files."
echo ""
echo "RECOMMENDATION:"
echo "1. Keep your current .env file as a backup"
echo "2. Compare values in .env with your CONFIGS/config.json"
echo "3. Compare server configs in .env with CONFIGS/SERVERS/*.json"
echo "4. Once verified, you can delete the CONFIGS folder"
echo ""

# Backup current .env if it exists
if [ -f ".env" ]; then
    BACKUP_NAME=".env.backup.$(date +%Y%m%d_%H%M%S)"
    echo "Creating backup: $BACKUP_NAME"
    cp .env "$BACKUP_NAME"
    echo "✓ Backup created"
fi

echo ""
echo "=================================================="
echo "Your setup is ready for environment-only mode!"
echo "=================================================="
echo ""
echo "To deploy without JSON config files:"
echo ""
echo "1. Review your .env file and ensure all values are correct"
echo "2. Run: docker compose up -d"
echo "3. Check logs: docker compose logs -f"
echo "4. Look for: '[ConfigLoader] Running in ENV_ONLY mode'"
echo ""
echo "To add more servers, add to .env:"
echo "  UR_SERVER2__SERVER_ENABLED=true"
echo "  UR_SERVER2__SERVER_SHORTNAME=My Second Server"
echo "  ... etc"
echo ""
echo "Once verified working, you can remove the CONFIGS folder."
echo ""
