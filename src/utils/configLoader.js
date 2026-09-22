const fs = require('fs');
const path = require('path');

const ROOT_PATH = path.resolve(__dirname, '..', '..');
const CONFIG_PATH = path.join(ROOT_PATH, 'CONFIGS', 'config.json');
const SERVER_CONFIGS_PATH = path.join(ROOT_PATH, 'CONFIGS', 'SERVERS');

// Check if we're running in env-only mode (no config files needed)
const ENV_ONLY_MODE = process.env.UR_ENV_ONLY === 'true';

// Default schema for the global config. This ensures that when running in
// ENV_ONLY mode, every nested property the codebase expects to exist is
// present (even if disabled/empty), preventing "Cannot read properties of
// undefined" crashes when a UR_CONFIG__* env var wasn't provided.
const DEFAULT_GLOBAL_CONFIG = {
    DISCORD_SERVER_ID: "",
    STEAM_API_KEY: "",
    GLOBAL_POP_BOT: {
        ENABLED: false,
        BOT_TOKEN: "",
        MULTI_MESSAGE: {
            ENABLED: false,
            PLAYER_COUNT_MESSAGE: "",
            PLAYERS_JOINING_MESSAGE: "",
            PLAYERS_QUEUED_MESSAGE: ""
        },
        SINGLE_MESSAGE: {
            PLAYER_COUNT_MESSAGE: ""
        }
    },
    PLAYER_PROFILER: {
        ENABLED: false,
        BOT_TOKEN: "",
        "Update player steam info every x hours (Will update a users steam data once a user joins the server after this threshold)": 24,
        GLOBAL_LEADERBOARD: {
            ENABLED: false,
            CHANNEL_ID: "",
            "COLOR(original, green, blue, black, yellow, orange, pink, red, purple, custom)": "blue",
            CUSTOM_COLOR: "#242424"
        },
        PROFILE_VIEW: {
            ENABLED: false,
            REQUIRE_ROLES: false,
            REQUIRED_ROLES: []
        },
        STATS_COMMAND: {
            ENABLED: false,
            REQUIRE_ROLES: false,
            REQUIRED_ROLES: [],
            "COLOR(original, green, blue, black, yellow, orange, pink, red, purple)": "black"
        },
        ACCOUNT_CHECKS_WHITELISTER: {
            ENABLED: false,
            REQUIRE_ROLES: false,
            REQUIRED_ROLES: []
        },
        WATCHLIST: {
            ENABLED: false,
            REQUIRE_ROLES: false,
            REQUIRED_ROLES: [],
            ALERT_ROLES: [],
            SIMPLE_FORMATTING: true,
            ALERT_WEBHOOK: "",
            EMBED_COLOR: "#f56642"
        },
        F7_PLAYER_SETTINGS: {
            ENABLED: false,
            REQUIRE_ROLES: false,
            REQUIRED_ROLES: []
        }
    }
};

// Default schema for a single server config. Mirrors CONFIGS/SERVERS/*.json
// so that env-only server configs never have missing nested objects.
const DEFAULT_SERVER_CONFIG = {
    SERVER_ENABLED: true,
    SERVER_SHORTNAME: "",
    SERVER_SPECIAL_ID: "",
    SERVER_IP: "",
    SERVER_PORT: "",
    RCON_PORT: "",
    RCON_PASS: "",
    BOT_TOKEN: "",
    BOT_CLIENT_ID: "",
    "USING UR PLUS PLUGIN": false,
    LEADERBOARD: {
        ENABLED: false,
        CHANNEL_ID: "",
        "DEFAULT_DISPLAY(wipe, lifetime)": "lifetime",
        "COLOR(original, green, blue, black, yellow, orange, pink, red, purple, custom)": "custom",
        CUSTOM_COLOR: "#242424"
    },
    SERVER_STATUS_PAGE: {
        ENABLED: false,
        CHANNEL_ID: "",
        "COLOR(original, green, blue, black, yellow, orange, pink, red, purple, custom)": "black",
        CUSTOM_COLOR: "#000000"
    },
    WIPE_ANNOUNCEMENTS: {
        ENABLED: false,
        WEBHOOK: "",
        EMBED_SETTINGS: {
            EXTERNAL_CONTENT: "",
            TITLE: "{SERVER_SHORTNAME} has wiped!",
            DESCRIPTION: "",
            SMALL_IMAGE: "",
            LARGE_IMAGE: {
                RUSTMAPS_API_KEY: "",
                LARGE_IMAGE: ""
            },
            FOOTER: "",
            EMBED_COLOR: "#4fff87"
        }
    },
    CHAT_LOGS: {
        DO_YOU_USE_BETTER_CHAT: false,
        SIMPLE_FORMATTING: true,
        GLOBAL_CHAT_LOGS: { ENABLED: false, GLOBAL_CHAT_WEBHOOK: "", EMBED_COLOR: "#00ff26" },
        TEAM_CHAT_LOGS: { ENABLED: false, TEAM_CHAT_WEBHOOK: "", EMBED_COLOR: "#ff0008" },
        LOCAL_CHAT_LOGS: { ENABLED: false, LOCAL_CHAT_WEBHOOK: "", EMBED_COLOR: "#fffb7d" },
        DISCORD_TO_INGAME_MESSAGES: {
            ENABLED: false,
            CHAT_CHANNEL_IDS: [],
            REQUIRE_ROLES_TO_SEND_MESSAGES: false,
            REQUIRED_ROLES: [],
            MESSAGE_FORMAT: "<color=#7289DA>[DISCORD] {user}:</color>"
        }
    },
    USER_MUTING: {
        AUTOMATED_MUTING: {
            ENABLED: false,
            WATCH_TEAM_CHAT: false,
            MUTE_WORDS_AND_REASONS: [],
            LOG_AUTO_MUTES: false,
            SIMPLE_FORMATTING: true,
            LOG_WEBHOOK: "",
            EMBED_COLOR: "#ff0008"
        }
    },
    DYNAMIC_MAXPLAYERS_CHANGER: {
        ENABLED: false,
        OPTIONS: {
            DONT_CHANGE_POP_IF_FPS_IS_LESS_THAN: "0",
            BASIC: { ENABLED: false, CONDITIONALS: [] },
            QUEUEING: { ENABLED: false, QUEUE_COUNT_TO_INCREASE: "0", CONDITIONALS: [] }
        },
        LOGGING: { ENABLED: false, SIMPLE_FORMATTING: false, LOG_WEBHOOK: "", EMBED_COLOR: "#49e637" }
    },
    RCON_SETTINGS: {
        RCON_MESSAGE_LOGS: {
            ENABLED: false,
            SIMPLE_FORMATTING: true,
            LOG_WEBHOOK: "",
            EMBED_COLOR: "#00ff26",
            DONT_SEND_RCON_MESSAGES_THAT_INCLUDE: [],
            MESSAGE_CHUNKING_COUNT: 5
        },
        RCON_COMMANDS: {
            ENABLED: false,
            COMMAND_PREFIX: "$",
            STAFF_ROLES: [],
            COMMAND_CHANNEL_IDS: [],
            CUSTOM_COMMANDS: {
                COMMANDS: []
            }
        }
    },
    SERVER_ONLINE_OFFLINE: {
        ENABLED: false,
        SIMPLE_FORMATTING: true,
        MENTION_WEBHOOK: "",
        MENTION_USER_ID: "",
        ONLINE_EMBED_SETTINGS: {
            WEBHOOK: "", TITLE: "{SERVER_SHORTNAME} has come online!", DESCRIPTION: "", LARGE_IMAGE: "", SMALL_IMAGE: "", FOOTER: "SERVER ONLINE", COLOR: "#49e637"
        },
        OFFLINE_EMBED_SETTINGS: {
            WEBHOOK: "", TITLE: "{SERVER_SHORTNAME} has gone offline!", DESCRIPTION: "", LARGE_IMAGE: "", SMALL_IMAGE: "", FOOTER: "SERVER OFFLINE", COLOR: "#eb4034"
        }
    },
    USE_POP_AS_A_BOT_STATUS: {
        ENABLED: false,
        OPTIONS: {
            SERVER_OFFLINE_MESSAGE: "[ OFFLINE ]",
            DIDNT_WIPE_TODAY: {
                PLAYER_COUNT_MESSAGE: "({playersOnline}/{maxPlayers}) Online!",
                PLAYERS_JOINING_MESSAGE: "({playersOnline}/{maxPlayers}) Joining",
                PLAYERS_QUEUED_MESSAGE: "({playersOnline}/{maxPlayers}) Queued",
                ENABLE_THRESHOLD_MESSAGE: false,
                THRESHOLD_PERCENT: "20",
                THRESHOLD_MESSAGE: "come join!"
            },
            WIPED_TODAY: {
                ENABLED: false,
                MAX_HOURS_SINCE_LAST_WIPE: "24",
                WIPED_TODAY_STATUS: {
                    PLAYER_COUNT_MESSAGE: "({playersOnline}/{maxPlayers}) Wiped Today!",
                    PLAYERS_JOINING_MESSAGE: "({playersOnline}/{maxPlayers}) Joining",
                    PLAYERS_QUEUED_MESSAGE: "({playersOnline}/{maxPlayers}) Queued",
                    ENABLE_THRESHOLD_MESSAGE: false,
                    THRESHOLD_PERCENT: "20",
                    THRESHOLD_MESSAGE: "Come join!"
                }
            }
        }
    },
    PLAYER_ACCOUNT_CHECKS: {
        BAN_CHECKER: {
            ENABLED: false,
            SIMPLE_FORMATTING: true,
            THRESHOLDS: { RUST_TEMP_BANS: 1, VAC_BANS: 1, EAC_BANS: 1, DAYS_SINCE_LAST_BAN: 30 },
            MENTION_STAFF_ROLES: [],
            LOG_WEBHOOK: "",
            EMBED_COLOR: "#03dffc"
        }
    },
    SERVER_LOGGING: {
        F7_REPORT_LOGGING: { ENABLED: false, SIMPLE_FORMATTING: false, LOG_WEBHOOK: "", EMBED_COLOR: "#03dffc" },
        F1_SPAWN_ITEM_LOGS: { ENABLED: false, SIMPLE_FORMATTING: false, LOG_WEBHOOK: "", EMBED_COLOR: "#03dffc" },
        SERVER_JOIN_LOGS: { ENABLED: false, USE_PLUGIN_JOIN_LOGS: false, SIMPLE_FORMATTING: true, LOG_WEBHOOK: "", EMBED_COLOR: "#6408cc" },
        SERVER_LEAVE_LOGS: { ENABLED: false, USE_PLUGIN_LEAVE_LOGS: false, SIMPLE_FORMATTING: true, LOG_WEBHOOK: "", EMBED_COLOR: "#e30202" },
        "(SERVER)MESSAGE_LOGS": { ENABLED: false, LOG_WEBHOOK: "", EMBED_COLOR: "#03dffc" },
        KILL_LOGS: { ENABLED: false, SIMPLE_FORMATTING: true, USE_PLUGIN_KILL_LOGS: false, INCLUDE_SUICIDES: false, INCLUDE_NPCS: false, LOG_WEBHOOK: "", EMBED_COLOR: "#03dffc" },
        PRIVATE_MESSAGES: { ENABLED: false, SIMPLE_FORMATTING: false, LOG_WEBHOOK: "", EMBED_COLOR: "#03dffc" }
    },
    PLUGIN_ONLY_LOGGING: {
        EVENT_SPAWNS: { ENABLED: false, SIMPLE_FORMATTING: false, LOG_WEBHOOK: "", EMBED_COLOR: "#03dffc" },
        PERM_CHANGES: { ENABLED: false, SIMPLE_FORMATTING: false, LOG_WEBHOOK: "", EMBED_COLOR: "#03dffc" },
        FEEDBACK_LOGGING: { ENABLED: false, SIMPLE_FORMATTING: false, LOG_WEBHOOK: "", EMBED_COLOR: "#03dffc" }
    }
};

// Deep-merges `overrides` on top of `defaults`, keeping any keys from
// `defaults` that aren't present in `overrides` and vice versa. Arrays in
// `overrides` fully replace arrays in `defaults`.
function deepMergeDefaults(defaults, overrides) {
    if (Array.isArray(defaults) || Array.isArray(overrides)) {
        return overrides !== undefined ? overrides : defaults;
    }

    if (defaults !== null && typeof defaults === 'object') {
        const result = {};
        const keys = new Set([
            ...Object.keys(defaults),
            ...(overrides && typeof overrides === 'object' ? Object.keys(overrides) : [])
        ]);

        keys.forEach((key) => {
            const defVal = defaults[key];
            const overVal = overrides ? overrides[key] : undefined;

            if (defVal !== null && typeof defVal === 'object' && !Array.isArray(defVal)) {
                result[key] = deepMergeDefaults(defVal, overVal);
            } else if (overVal !== undefined) {
                result[key] = overVal;
            } else {
                result[key] = defVal;
            }
        });

        return result;
    }

    return overrides !== undefined ? overrides : defaults;
}

function parseEnvValue(rawValue) {
    if (rawValue === 'true') return true;
    if (rawValue === 'false') return false;
    if (rawValue === 'null') return null;

    // Check if it looks like a number
    if (/^-?\d+(\.\d+)?$/.test(rawValue)) {
        // Don't convert very large integers (like Discord IDs) to numbers
        // JavaScript can't safely represent integers larger than 2^53 - 1
        const asNumber = Number(rawValue);
        if (Number.isSafeInteger(asNumber)) {
            return asNumber;
        }
        // Keep large integers as strings to avoid precision loss
        return rawValue;
    }

    const trimmed = rawValue.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
            return JSON.parse(trimmed);
        } catch (err) {
            return rawValue;
        }
    }

    return rawValue;
}

function sanitizeKey(key) {
    return key.toUpperCase().replace(/[^A-Z0-9]/g, '_');
}

function applyEnvOverrides(target, envPrefix, currentPath = []) {
    if (Array.isArray(target)) {
        target.forEach((value, index) => {
            const nextPath = [...currentPath, String(index)];
            const envKey = `${envPrefix}__${nextPath.map(sanitizeKey).join('__')}`;
            if (process.env[envKey] !== undefined) {
                target[index] = parseEnvValue(process.env[envKey]);
                return;
            }

            if (value !== null && typeof value === 'object') {
                applyEnvOverrides(value, envPrefix, nextPath);
            }
        });
        return target;
    }

    Object.keys(target).forEach((key) => {
        const value = target[key];
        const nextPath = [...currentPath, key];
        const envKey = `${envPrefix}__${nextPath.map(sanitizeKey).join('__')}`;

        if (process.env[envKey] !== undefined) {
            target[key] = parseEnvValue(process.env[envKey]);
            return;
        }

        if (value !== null && typeof value === 'object') {
            applyEnvOverrides(value, envPrefix, nextPath);
        }
    });

    return target;
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildConfigFromEnv(envPrefix) {
    const config = {};
    const prefix = `${envPrefix}__`;
    
    Object.keys(process.env).forEach((key) => {
        if (!key.startsWith(prefix)) return;
        
        const path = key.substring(prefix.length).split('__');
        let current = config;
        
        for (let i = 0; i < path.length - 1; i++) {
            const part = path[i];
            if (!current[part]) {
                current[part] = {};
            }
            current = current[part];
        }
        
        const finalKey = path[path.length - 1];
        current[finalKey] = parseEnvValue(process.env[key]);
    });
    
    return config;
}

function loadGlobalConfig() {
    let config = {};
    
    // If ENV_ONLY_MODE, build config entirely from environment variables
    if (ENV_ONLY_MODE) {
        const urConfigVars = Object.keys(process.env).filter(k => k.startsWith('UR_CONFIG'));
        console.log('[ConfigLoader] Found', urConfigVars.length, 'UR_CONFIG environment variables');
        if (urConfigVars.length === 0) {
            console.warn('[ConfigLoader] No UR_CONFIG__ environment variables found, using defaults (everything disabled).');
        }
        
        config = buildConfigFromEnv('UR_CONFIG');
        // Fill in any missing nested keys with safe defaults so the app never
        // crashes on `undefined.ENABLED` style accesses.
        config = deepMergeDefaults(DEFAULT_GLOBAL_CONFIG, config);
        console.log('[ConfigLoader] Running in ENV_ONLY mode - loaded config from environment variables');
    } else {
        // Legacy mode: read from JSON file and allow env overrides
        if (fs.existsSync(CONFIG_PATH)) {
            config = readJson(CONFIG_PATH);
            applyEnvOverrides(config, 'UR_CONFIG');
            config = deepMergeDefaults(DEFAULT_GLOBAL_CONFIG, config);
        } else {
            console.warn(`[ConfigLoader] Config file not found at ${CONFIG_PATH}, falling back to env-only mode`);
            config = buildConfigFromEnv('UR_CONFIG');
            config = deepMergeDefaults(DEFAULT_GLOBAL_CONFIG, config);
        }
    }
    
    return config;
}

// Normalizes a server config object (whether loaded from JSON or built from
// env vars) by:
//  1. Aliasing the sanitized env key USING_UR_PLUS_PLUGIN to the literal
//     "USING UR PLUS PLUGIN" key the codebase actually reads.
//  2. Auto-generating SERVER_SPECIAL_ID from the prefix/shortname if missing
//     (prevents SQLite NOT NULL constraint failures on server_logs.server_id).
//  3. Deep-merging onto DEFAULT_SERVER_CONFIG so every nested property the
//     codebase expects to exist is present.
function normalizeServerConfig(config, fallbackId) {
    if (config.USING_UR_PLUS_PLUGIN !== undefined && config["USING UR PLUS PLUGIN"] === undefined) {
        config["USING UR PLUS PLUGIN"] = config.USING_UR_PLUS_PLUGIN;
    }

    if (!config.SERVER_SPECIAL_ID) {
        config.SERVER_SPECIAL_ID = config.SERVER_SHORTNAME || fallbackId;
    }

    return deepMergeDefaults(DEFAULT_SERVER_CONFIG, config);
}

function loadServerConfigs() {
    const configs = [];
    
    if (ENV_ONLY_MODE) {
        // Build server configs from environment variables
        // Look for UR_SERVER1__, UR_SERVER2__, etc.
        const serverPrefixes = new Set();
        Object.keys(process.env).forEach((key) => {
            const match = key.match(/^UR_(SERVER\d+)__/);
            if (match) {
                serverPrefixes.add(match[1]);
            }
        });
        
        serverPrefixes.forEach((prefix) => {
            let config = buildConfigFromEnv(`UR_${prefix}`);
            config = normalizeServerConfig(config, prefix);
            if (config.SERVER_ENABLED !== false) {
                configs.push(config);
            }
        });
        
        console.log(`[ConfigLoader] Loaded ${configs.length} server config(s) from environment variables`);
    } else {
        // Legacy mode: read from JSON files
        if (fs.existsSync(SERVER_CONFIGS_PATH)) {
            const serverFiles = fs.readdirSync(SERVER_CONFIGS_PATH)
                .filter((fileName) => fileName.endsWith('.json'));
            
            serverFiles.forEach((fileName) => {
                let config = readJson(path.join(SERVER_CONFIGS_PATH, fileName));
                const filePrefix = `UR_${path.basename(fileName, '.json').toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;

                applyEnvOverrides(config, filePrefix);
                applyEnvOverrides(config, 'UR_SERVER_DEFAULT');

                config = normalizeServerConfig(config, path.basename(fileName, '.json'));

                configs.push(config);
            });
        } else {
            console.warn(`[ConfigLoader] Server configs path not found at ${SERVER_CONFIGS_PATH}, falling back to env-only mode`);
            // Fallback to env-only mode for servers
            const serverPrefixes = new Set();
            Object.keys(process.env).forEach((key) => {
                const match = key.match(/^UR_(SERVER\d+)__/);
                if (match) {
                    serverPrefixes.add(match[1]);
                }
            });
            
            serverPrefixes.forEach((prefix) => {
                let config = buildConfigFromEnv(`UR_${prefix}`);
                config = normalizeServerConfig(config, prefix);
                if (config.SERVER_ENABLED !== false) {
                    configs.push(config);
                }
            });
        }
    }
    
    return configs;
}

const globalConfig = loadGlobalConfig();

module.exports = {
    globalConfig,
    loadGlobalConfig,
    loadServerConfigs,
    applyEnvOverrides,
    parseEnvValue
};