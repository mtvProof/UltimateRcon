const fs = require('fs');
const path = require('path');

const ROOT_PATH = path.resolve(__dirname, '..', '..');
const CONFIG_PATH = path.join(ROOT_PATH, 'CONFIGS', 'config.json');
const SERVER_CONFIGS_PATH = path.join(ROOT_PATH, 'CONFIGS', 'SERVERS');

// Check if we're running in env-only mode (no config files needed)
const ENV_ONLY_MODE = process.env.UR_ENV_ONLY === 'true';

function parseEnvValue(rawValue) {
    if (rawValue === 'true') return true;
    if (rawValue === 'false') return false;
    if (rawValue === 'null') return null;

    if (/^-?\d+(\.\d+)?$/.test(rawValue)) {
        return Number(rawValue);
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
        // Debug: List all UR_CONFIG env vars
        const urConfigVars = Object.keys(process.env).filter(k => k.startsWith('UR_CONFIG'));
        console.log('[ConfigLoader] Found', urConfigVars.length, 'UR_CONFIG environment variables');
        if (urConfigVars.length === 0) {
            console.error('[ConfigLoader] ERROR: No UR_CONFIG__ environment variables found!');
            console.error('[ConfigLoader] Make sure environment variables are properly set in Portainer.');
            console.error('[ConfigLoader] Sample env vars present:', Object.keys(process.env).slice(0, 10));
        }
        
        config = buildConfigFromEnv('UR_CONFIG');
        console.log('[ConfigLoader] Running in ENV_ONLY mode - loaded config from environment variables');
        console.log('[ConfigLoader] Global config keys:', Object.keys(config));
        console.log('[ConfigLoader] PLAYER_PROFILER exists:', !!config.PLAYER_PROFILER);
    } else {
        // Legacy mode: read from JSON file and allow env overrides
        if (fs.existsSync(CONFIG_PATH)) {
            config = readJson(CONFIG_PATH);
            applyEnvOverrides(config, 'UR_CONFIG');
        } else {
            console.warn(`[ConfigLoader] Config file not found at ${CONFIG_PATH}, falling back to env-only mode`);
            config = buildConfigFromEnv('UR_CONFIG');
        }
    }
    
    return config;
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
            const config = buildConfigFromEnv(`UR_${prefix}`);
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
                const config = readJson(path.join(SERVER_CONFIGS_PATH, fileName));
                const filePrefix = `UR_${path.basename(fileName, '.json').toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;

                applyEnvOverrides(config, filePrefix);
                applyEnvOverrides(config, 'UR_SERVER_DEFAULT');

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
                const config = buildConfigFromEnv(`UR_${prefix}`);
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