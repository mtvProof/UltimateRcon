#!/bin/bash
# Script to initialize the database inside the container

echo "Initializing database..."
docker compose exec ultimate-rcon sqlite3 /bot/src/database/database.sqlite3 < init-database.sql
echo "Database initialized successfully!"
