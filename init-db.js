// Database initialization script
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'src', 'database', 'database.sqlite3');
console.log('[DB Init] Connecting to database:', dbPath);

const db = new Database(dbPath);

console.log('[DB Init] Creating tables...');

// Server logs table
db.exec(`
CREATE TABLE IF NOT EXISTS server_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id TEXT NOT NULL,
    log_type TEXT NOT NULL,
    message TEXT,
    player_name TEXT,
    player_steamid TEXT,
    timestamp INTEGER NOT NULL
);
`);
console.log('[DB Init] ✓ server_logs table created');

// Player information table
db.exec(`
CREATE TABLE IF NOT EXISTS player_info (
    steamid TEXT PRIMARY KEY,
    name TEXT,
    avatar TEXT,
    profile_url TEXT,
    country_code TEXT,
    time_created INTEGER,
    community_banned INTEGER DEFAULT 0,
    vac_bans INTEGER DEFAULT 0,
    game_bans INTEGER DEFAULT 0,
    economy_ban TEXT,
    days_since_last_ban INTEGER,
    total_playtime INTEGER DEFAULT 0,
    first_seen INTEGER,
    last_seen INTEGER,
    total_joins INTEGER DEFAULT 0,
    lastUpdated INTEGER,
    watchlist INTEGER DEFAULT 0
);
`);
console.log('[DB Init] ✓ player_info table created');

// Leaderboard table
db.exec(`
CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id TEXT NOT NULL,
    steamid TEXT NOT NULL,
    player_name TEXT,
    kills INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    kd_ratio REAL DEFAULT 0,
    playtime INTEGER DEFAULT 0,
    wipe_cycle TEXT,
    updated_at INTEGER NOT NULL
);
`);
console.log('[DB Init] ✓ leaderboard table created');

// Server status table
db.exec(`
CREATE TABLE IF NOT EXISTS server_status (
    server_id TEXT PRIMARY KEY,
    online INTEGER DEFAULT 0,
    players_online INTEGER DEFAULT 0,
    max_players INTEGER DEFAULT 0,
    queue_count INTEGER DEFAULT 0,
    joining_count INTEGER DEFAULT 0,
    fps INTEGER DEFAULT 0,
    last_wipe INTEGER,
    map_seed TEXT,
    map_size TEXT,
    last_updated INTEGER NOT NULL
);
`);
console.log('[DB Init] ✓ server_status table created');

// Create indexes
db.exec(`
CREATE INDEX IF NOT EXISTS idx_server_logs_server_id ON server_logs(server_id);
CREATE INDEX IF NOT EXISTS idx_server_logs_timestamp ON server_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_player_info_last_seen ON player_info(last_seen);
CREATE INDEX IF NOT EXISTS idx_leaderboard_server_id ON leaderboard(server_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_wipe_cycle ON leaderboard(wipe_cycle);
`);
console.log('[DB Init] ✓ Indexes created');

db.close();
console.log('[DB Init] Database initialization complete!');
