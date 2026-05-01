const fs = require('fs');
const path = require('path');

const ROOT_PATH = path.resolve(__dirname, '..', '..');
const CONFIG_PATH = path.join(ROOT_PATH, 'CONFIGS', 'config.json');
const SERVER_CONFIGS_PATH = path.join(ROOT_PATH, 'CONFIGS', 'SERVERS');

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

function loadGlobalConfig() {
    const config = readJson(CONFIG_PATH);
    return applyEnvOverrides(config, 'UR_CONFIG');
}

function loadServerConfigs() {
    return fs.readdirSync(SERVER_CONFIGS_PATH)
        .filter((fileName) => fileName.endsWith('.json'))
        .map((fileName) => {
            const config = readJson(path.join(SERVER_CONFIGS_PATH, fileName));
            const filePrefix = `UR_${path.basename(fileName, '.json').toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;

            applyEnvOverrides(config, filePrefix);
            applyEnvOverrides(config, 'UR_SERVER_DEFAULT');

            return config;
        });
}

const globalConfig = loadGlobalConfig();

module.exports = {
    globalConfig,
    loadGlobalConfig,
    loadServerConfigs,
    applyEnvOverrides,
    parseEnvValue
};