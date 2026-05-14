# 🚀 Environment-Only Deployment - Setup Complete!

## What Changed?

Your bot has been upgraded to support **environment-only configuration**! This means:

✅ **No more CONFIGS folder needed** - Everything is in `.env`  
✅ **Easy deployment** - Just copy `.env` and `docker-compose.yml` to any machine  
✅ **Quick updates** - Change configs without editing JSON files  
✅ **Cleaner setup** - All configuration in one file  

## Files Modified

### 1. **configLoader.js** ✏️
- Now supports `UR_ENV_ONLY=true` mode
- Builds configuration entirely from environment variables
- Falls back to JSON files if they exist (backward compatible)

### 2. **docker-compose.yml** ✏️
- Removed `CONFIGS_DIR` volume mount
- Added `env_file: .env` to load all environment variables
- Set `UR_ENV_ONLY=true` to enable environment-only mode
- Simplified volume mounts (only database and images)

### 3. **docker/start.sh** ✏️
- Removed config folder symlink creation
- Only links database and image storage now

### 4. **Documentation** 📄
- Created `DEPLOYMENT.md` with complete deployment guide
- Created `migrate-to-env.sh` helper script

## How to Deploy NOW

### Option 1: Clean Environment-Only Deployment (Recommended)

```bash
# 1. Review your .env file
nano .env

# 2. Start the container
docker compose up -d

# 3. Watch the logs
docker compose logs -f
```

You should see: `[ConfigLoader] Running in ENV_ONLY mode`

### Option 2: Keep Using JSON Files (Legacy Mode)

If you want to keep using JSON config files:

1. Edit [docker-compose.yml](docker-compose.yml):
```yaml
environment:
  - UR_ENV_ONLY=false  # Change this line
volumes:
  - ./CONFIGS:/bot/local-configs  # Add this line
```

2. Restart: `docker compose restart`

## Deploy on a New Machine

To deploy on a completely new machine:

**Copy these files:**
```
├── .env                    # Your configuration
├── docker-compose.yml      # Container setup
├── Dockerfile              # Build instructions
└── docker/
    └── start.sh           # Startup script
```

**Then run:**
```bash
docker compose up -d
```

That's it! No CONFIGS folder needed! 🎉

## Environment Variable Format

Variables use double underscores (`__`) for nesting:

```bash
# Global config
UR_CONFIG__STEAM_API_KEY=abc123
UR_CONFIG__PLAYER_PROFILER__ENABLED=true

# Server 1
UR_SERVER1__SERVER_IP=1.2.3.4
UR_SERVER1__RCON_PORT=28016

# Server 2
UR_SERVER2__SERVER_IP=5.6.7.8
UR_SERVER2__RCON_PORT=28016
```

**Data types:**
- Strings: `KEY=value` or `KEY="value"`
- Numbers: `KEY=123` or `KEY=45.67`
- Booleans: `KEY=true` or `KEY=false`
- Arrays: `KEY=["item1","item2"]`
- Objects: `KEY={"prop":"value"}`

## Adding More Servers

Just copy the SERVER1 variables and change to SERVER2, SERVER3, etc.:

```bash
UR_SERVER2__SERVER_ENABLED=true
UR_SERVER2__SERVER_SHORTNAME=PvP Server
UR_SERVER2__SERVER_SPECIAL_ID=server2
UR_SERVER2__SERVER_IP=your.ip
UR_SERVER2__SERVER_PORT=28015
UR_SERVER2__RCON_PORT=28016
UR_SERVER2__RCON_PASS=password
UR_SERVER2__BOT_TOKEN=token
UR_SERVER2__BOT_CLIENT_ID=client_id
# ... add other settings
```

## Verifying Your Setup

```bash
# Check if ENV_ONLY mode is enabled
docker compose exec ultimate-rcon env | grep UR_ENV_ONLY

# Should show: UR_ENV_ONLY=true

# Check all your config variables
docker compose exec ultimate-rcon env | grep "UR_CONFIG\|UR_SERVER"

# View logs to confirm
docker compose logs -f ultimate-rcon
```

## Migration Checklist

- [ ] Review `.env` file with your configuration
- [ ] Test with `docker compose up -d`
- [ ] Verify logs show "ENV_ONLY mode"
- [ ] Test bot functionality
- [ ] Once verified, optionally remove CONFIGS folder
- [ ] Commit `.env.example` to git (NOT `.env`!)
- [ ] Keep `.env` secure and backed up

## Troubleshooting

**Bot won't start?**
- Check: `docker compose logs -f`
- Verify: All required env vars are set

**Still loading from JSON?**
- Check: `docker-compose.yml` has `UR_ENV_ONLY=true`
- Rebuild: `docker compose up -d --build`

**Want to switch back to JSON?**
- Set `UR_ENV_ONLY=false` in docker-compose.yml
- Mount CONFIGS folder as volume
- Restart container

## Next Steps

1. **Read** [DEPLOYMENT.md](DEPLOYMENT.md) for detailed documentation
2. **Test** your deployment with `docker compose up -d`
3. **Verify** everything works
4. **Deploy** to your production machine with just `.env`
5. **Enjoy** easier config management! 🎉

---

**Questions?** Check [DEPLOYMENT.md](DEPLOYMENT.md) for more details!
