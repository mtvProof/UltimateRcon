# 🎯 Quick Reference - Environment Variables

## Common Commands

```bash
# Start bot
docker compose up -d

# View logs
docker compose logs -f

# Restart bot
docker compose restart

# Stop bot
docker compose down

# Rebuild container
docker compose up -d --build

# Check environment variables
docker compose exec ultimate-rcon env | grep UR_
```

## Required Environment Variables

### Global Config
```bash
UR_CONFIG__DISCORD_SERVER_ID=your_discord_server_id
UR_CONFIG__STEAM_API_KEY=your_steam_api_key
UR_CONFIG__PLAYER_PROFILER__BOT_TOKEN=your_profiler_bot_token
```

### Server Config (Minimum for each server)
```bash
UR_SERVER1__SERVER_ENABLED=true
UR_SERVER1__SERVER_SHORTNAME=Server Name
UR_SERVER1__SERVER_SPECIAL_ID=server1
UR_SERVER1__SERVER_IP=your.server.ip
UR_SERVER1__SERVER_PORT=28015
UR_SERVER1__RCON_PORT=28016
UR_SERVER1__RCON_PASS=your_rcon_password
UR_SERVER1__BOT_TOKEN=your_server_bot_token
UR_SERVER1__BOT_CLIENT_ID=your_bot_client_id
UR_SERVER1__USING_UR_PLUS_PLUGIN=true
```

## Variable Naming Convention

```
PREFIX__SECTION__SUBSECTION__KEY=value
```

**Prefixes:**
- `UR_CONFIG__` → Global configuration
- `UR_SERVER1__` → Server 1 configuration
- `UR_SERVER2__` → Server 2 configuration
- etc.

## Data Types

```bash
# String
KEY=value
KEY="value with spaces"

# Number
KEY=123
KEY=3.14

# Boolean
KEY=true
KEY=false

# Array (JSON)
KEY=["value1","value2","value3"]

# Object (JSON)
KEY={"prop1":"value1","prop2":"value2"}
```

## Common Settings

### Enable/Disable Features
```bash
UR_CONFIG__PLAYER_PROFILER__ENABLED=true
UR_SERVER1__LEADERBOARD__ENABLED=false
UR_SERVER1__CHAT_LOGS__GLOBAL_CHAT_LOGS__ENABLED=true
```

### Discord Webhooks
```bash
UR_SERVER1__WIPE_ANNOUNCEMENTS__WEBHOOK=https://discord.com/...
UR_SERVER1__CHAT_LOGS__GLOBAL_CHAT_LOGS__GLOBAL_CHAT_WEBHOOK=https://discord.com/...
```

### Role Requirements
```bash
UR_CONFIG__PLAYER_PROFILER__PROFILE_VIEW__REQUIRE_ROLES=true
UR_CONFIG__PLAYER_PROFILER__PROFILE_VIEW__REQUIRED_ROLES=["role_id_1","role_id_2"]
```

### Colors
```bash
UR_SERVER1__LEADERBOARD__COLOR_ORIGINAL__GREEN__BLUE__BLACK__YELLOW__ORANGE__PINK__RED__PURPLE__CUSTOM_=custom
UR_SERVER1__LEADERBOARD__CUSTOM_COLOR=#242424
UR_SERVER1__CHAT_LOGS__GLOBAL_CHAT_LOGS__EMBED_COLOR=#00ff26
```

## File Locations

```
Your machine              Inside container
./data/database      →    /bot/local-database
./data/imagestorage  →    /bot/local-imagestorage
```

## Deployment Checklist

**Initial Setup:**
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in all required values
- [ ] Set `DATABASE_DIR` and `IMAGESTORE_DIR` (optional)
- [ ] Run `docker compose up -d`

**New Machine Deployment:**
- [ ] Copy `.env` file
- [ ] Copy `docker-compose.yml`
- [ ] Copy `Dockerfile` and `docker/start.sh`
- [ ] Run `docker compose up -d`

**Adding a Server:**
- [ ] Copy all `UR_SERVER1__` variables
- [ ] Replace `SERVER1` with `SERVER2` (or next number)
- [ ] Update values for new server
- [ ] Run `docker compose restart`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Bot won't start | Check logs: `docker compose logs -f` |
| Config not loading | Verify `UR_ENV_ONLY=true` in docker-compose.yml |
| Need old JSON files | Set `UR_ENV_ONLY=false` and mount CONFIGS |
| Bot token invalid | Check for spaces/quotes in .env |
| Missing settings | Compare with `.env.example` |

## Environment Variables Priority

1. **ENV_ONLY mode** (`UR_ENV_ONLY=true`):
   - Only reads from environment variables
   - JSON files are ignored

2. **Legacy mode** (`UR_ENV_ONLY=false`):
   - Reads JSON files first
   - Environment variables override JSON values

## See Also

- [DEPLOYMENT.md](DEPLOYMENT.md) - Full deployment guide
- [SETUP-COMPLETE.md](SETUP-COMPLETE.md) - What changed and why
- [.env.example](.env.example) - Complete variable reference
