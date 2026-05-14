# Ultimate Rcon Bot - Docker Deployment Guide

This guide explains how to deploy the Ultimate Rcon bot using Docker with environment variable configuration.

## Quick Deployment (No Local Config Files Needed!)

### Prerequisites
- Docker and Docker Compose installed
- Your bot tokens, API keys, and server details

### Step 1: Copy the Environment Template

```bash
cp .env.example .env
```

### Step 2: Edit Your Configuration

Open `.env` in your favorite editor and fill in your values:

```bash
nano .env
# or
vim .env
# or
code .env
```

**Required Settings:**
- `UR_CONFIG__DISCORD_SERVER_ID` - Your Discord server ID
- `UR_CONFIG__STEAM_API_KEY` - Your Steam API key
- `UR_CONFIG__PLAYER_PROFILER__BOT_TOKEN` - Your player profiler bot token
- `UR_SERVER1__SERVER_IP` - Your Rust server IP
- `UR_SERVER1__SERVER_PORT` - Your Rust server port
- `UR_SERVER1__RCON_PORT` - Your RCON port
- `UR_SERVER1__RCON_PASS` - Your RCON password
- `UR_SERVER1__BOT_TOKEN` - Your server bot token
- `UR_SERVER1__BOT_CLIENT_ID` - Your server bot client ID

### Step 3: Start the Container

```bash
docker compose up -d
```

That's it! The bot will:
1. Clone the latest code from the repository
2. Install dependencies
3. Load configuration from your `.env` file
4. Start running

### Step 4: Check Logs

```bash
docker compose logs -f
```

You should see: `[ConfigLoader] Running in ENV_ONLY mode - loaded config from environment variables`

## Adding Multiple Servers

To add more servers, simply add more environment variables with `SERVER2`, `SERVER3`, etc.:

```bash
# Server 2
UR_SERVER2__SERVER_ENABLED=true
UR_SERVER2__SERVER_SHORTNAME=PvP Server
UR_SERVER2__SERVER_SPECIAL_ID=server2
UR_SERVER2__SERVER_IP=your.server.ip
UR_SERVER2__SERVER_PORT=28015
UR_SERVER2__RCON_PORT=28016
UR_SERVER2__RCON_PASS=your_rcon_pass
UR_SERVER2__BOT_TOKEN=your_bot_token
UR_SERVER2__BOT_CLIENT_ID=your_client_id
# ... add all other settings you need

# Server 3
UR_SERVER3__SERVER_ENABLED=true
# ... etc
```

## Deploying on a New Machine

To deploy on a new machine, you only need:

1. **The `.env` file** with your configuration
2. **The `docker-compose.yml` file**
3. **The `Dockerfile` and `docker/start.sh`** (for building)

No more copying CONFIGS folders! Just:

```bash
# Copy these files to your new machine:
- .env
- docker-compose.yml
- Dockerfile
- docker/start.sh

# Then run:
docker compose up -d
```

## Data Persistence

The bot stores persistent data in Docker volumes:
- **Database**: `./data/database` (or custom path via `DATABASE_DIR`)
- **Image Storage**: `./data/imagestorage` (or custom path via `IMAGESTORE_DIR`)

To backup your data:
```bash
# Backup database
docker compose cp ultimate-rcon:/bot/local-database ./backup-database

# Backup images
docker compose cp ultimate-rcon:/bot/local-imagestorage ./backup-images
```

## Updating the Bot

The bot auto-updates from GitHub on each restart. To update:

```bash
docker compose restart
```

Or to rebuild the container:

```bash
docker compose down
docker compose up -d --build
```

## Environment Variable Format

Environment variables use a hierarchical format:

```
PREFIX__LEVEL1__LEVEL2__KEY=value
```

Examples:
- `UR_CONFIG__STEAM_API_KEY=abc123` → `config.STEAM_API_KEY = "abc123"`
- `UR_SERVER1__RCON_PORT=28016` → `server1.RCON_PORT = 28016`
- `UR_CONFIG__PLAYER_PROFILER__ENABLED=true` → `config.PLAYER_PROFILER.ENABLED = true`

**Arrays use JSON format:**
```bash
UR_CONFIG__PLAYER_PROFILER__REQUIRED_ROLES=["role_id_1", "role_id_2"]
```

## Troubleshooting

### Bot won't start
Check logs: `docker compose logs -f`

### Configuration not loading
Ensure `UR_ENV_ONLY=true` is set in docker-compose.yml (it should be by default)

### Need to use JSON config files instead?
Set `UR_ENV_ONLY=false` and mount your CONFIGS folder:
```yaml
volumes:
  - ./CONFIGS:/bot/local-configs
environment:
  - UR_ENV_ONLY=false
```

### Check what environment variables are set
```bash
docker compose exec ultimate-rcon env | grep UR_
```

## Legacy Mode (JSON Files)

If you prefer using JSON config files, you can disable ENV_ONLY mode:

1. Edit `docker-compose.yml`:
```yaml
environment:
  - UR_ENV_ONLY=false
volumes:
  - ./CONFIGS:/bot/local-configs
```

2. Create your `CONFIGS` folder with `config.json` and `SERVERS/` files

Environment variables will still override JSON values if both are present.

## Tips

- Keep your `.env` file secure and never commit it to git
- Use `.env.example` as a template for new deployments
- All boolean values: use `true` or `false` (lowercase)
- All numeric values: just the number (no quotes)
- All string values: can be with or without quotes
- All arrays/objects: use JSON format

## Support

For issues, check:
1. The logs: `docker compose logs -f`
2. The `.env.example` file for correct variable names
3. The GitHub repository for updates
