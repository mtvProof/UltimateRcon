# THANK YOU FOR PURCHASING ULTIMATE RCON+ #
Before continuing, I recommend joining my support Discord for any issues you might encounter -> https://discord.gg/kWKwynUUZr
I will walk you through the order that I recommend.

# - [ STEPS ] - #

# 0. INSTALLATION VIDEO
    - https://www.youtube.com/watch?v=yN1X1G56lB4

# 1. HOSTING
    - You will need a bot host. I recommend https://botreaper.com/
    - Alternatively, you can do this on a local or dedicated machine.

# 2. INSTALLATION
    - This may vary depending on where you're hosting. I will label two sets of steps below; however, they're quite similar.

    > 2a. HOSTING SERVICE (Panel interface) 
        - Here, all you need to do is upload the *ZIP* file onto your bot host. Then, using your host's panel tools, you will need to unzip or extract the zip.
        - That's it for uploading the files :)

    > 2b. DEDICATED SERVICE (Machine with no panel interface)
        - Upload the zip into a folder on the machine, then unzip the file.
        - Next, you will need to open a command prompt menu.
        - Once you've done that, you will need to CD into the folder where you're storing the bot information.
        - For example, the command to CD into the folder is (cd C:\Users\PC\Desktop\Rcon+) (No brackets).
        - Once you've done that, run (npm i) to install the required packages.

    > 2c. PLUGIN INSTALLATION
        - All you need to do is drag and drop the plugin onto your server and fill out the config.

# 3. BOT CONFIG
    - I know, the configs look intimidating. However, they're not as complicated as they seem.
    - I'm going to walk you through some basics of the config and some common errors.
    - Firstly, there are two places where you will locate configs: /CONFIGS/config.js and /CONFIGS/SERVERS/...
    - The configs found in /SERVERS/ will be for all your servers.
    - The /config.json file is for your player profiler commands and global population bot.
    - The server configs can be copied and pasted into the /SERVERS/ folder, just change the title of the configs.
    - Each server needs a unique server special ID. This can be whatever you want, just avoid spaces in it.
    - A server shortname can be whatever you want.
    - Anywhere a channel ID is needed, you can get that by right-clicking on the channel and selecting 'Copy ID' for the channel you want to receive messages.
    - Anywhere it asks for a ROLE, you can get that ID by right-clicking on the role and selecting 'Copy ID'.

# 4. STARTING THE BOT
    - Once you've filled out the config, it's time to start the bot.
    - If you're on a host (panel interface), there should just be a start button.
    - If you're on a machine without an interface, you will need to open the command prompt, CD into the folder, then run (node index.js) and the bot will start.

# 5. GITHUB + DOCKER DEPLOYMENT
    - This package is now ready to run in Docker using environment variables.
    - The Docker container now clones/pulls from your GitHub repo on startup.
    - Your local `CONFIGS` folder is mounted into the container and used directly.

    > 5a. ENVIRONMENT VARIABLE FORMAT
        - Global config file (`CONFIGS/config.json`) uses this prefix:
            - `UR_CONFIG__...`
        - Server file `CONFIGS/SERVERS/server1.json` uses:
            - `UR_SERVER1__...`
        - Server file `CONFIGS/SERVERS/server2.json` uses:
            - `UR_SERVER2__...`
        - Any key path can be overridden by replacing special characters with `_` and joining nested keys with `__`.

        - Example mappings:
            - `UR_CONFIG__DISCORD_SERVER_ID`
            - `UR_CONFIG__PLAYER_PROFILER__ENABLED`
            - `UR_SERVER1__SERVER_IP`
            - `UR_SERVER1__RCON_PASS`
            - `UR_SERVER2__SERVER_LOGGING__F7_REPORT_LOGGING__ENABLED`

    > 5b. SET UP YOUR ENV FILE
        - Copy `.env.example` to `.env`.
        - Fill in your values for Discord tokens, server IP, RCON password, and related settings.
        - For arrays/objects, use JSON format in the env value.

    > 5c. BUILD + RUN WITH DOCKER
        - Build and start with Docker Compose.
        - The compose file mounts:
            - `./CONFIGS -> /bot/CONFIGS`
            - `./src/database -> /bot/src/database`
            - `./src/images/imagestorage -> /bot/src/images/imagestorage`
        - So your local config files are always used at runtime.

    > 5d. UPDATE FLOW (push then pull)
        - Push your changes to GitHub.
        - Restart the container.
        - On restart, it fetches and resets to the latest `origin/main`.

    > 5e. PUSH TO GITHUB
        - Initialize git (if needed), add your remote repo, commit, and push.
        - Remote URL for this project:
            - `https://github.com/mtvProof/UltimateRcon`
