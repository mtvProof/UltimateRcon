// Database initialization script
const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'src', 'database', 'database.sqlite3');
console.log('[DB Init] Connecting to database:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('[DB Init] Error connecting to database:', err);
        process.exit(1);
    }
});

console.log('[DB Init] Creating tables...');

db.serialize(() => {
    // Server logs table
    db.run(`
    CREATE TABLE IF NOT EXISTS server_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        current_players INTEGER DEFAULT 0,
        peak_players INTEGER DEFAULT 0,
        last_wipe INTEGER DEFAULT 0,
        joining_players INTEGER DEFAULT 0,
        queued_players INTEGER DEFAULT 0,
        log_type TEXT,
        message TEXT,
        player_name TEXT,
        player_steamid TEXT,
        timestamp INTEGER
    );
    `, (err) => {
        if (err) console.error('[DB Init] Error creating server_logs:', err);
        else console.log('[DB Init] ✓ server_logs table created');
    });

    // Player information table
    db.run(`
    CREATE TABLE IF NOT EXISTS player_info (
        steam_id TEXT NOT NULL,
        server_id TEXT NOT NULL,
        picture TEXT,
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
        watchlist INTEGER DEFAULT 0,
        checker_whitelisted INTEGER DEFAULT 0,
        ignore_f7_from INTEGER DEFAULT 0,
        ignore_f7_against INTEGER DEFAULT 0,
        report_count INTEGER DEFAULT 0,
        kills INTEGER DEFAULT 0,
        deaths INTEGER DEFAULT 0,
        wipe_kills INTEGER DEFAULT 0,
        wipe_deaths INTEGER DEFAULT 0,
        PRIMARY KEY (steam_id, server_id)
    );
    `, (err) => {
        if (err) console.error('[DB Init] Error creating player_info:', err);
        else console.log('[DB Init] ✓ player_info table created');
    });

    // Leaderboard table
    // NOTE: channel_id/message_id are required by establishConnection.js to
    // track which Discord message holds the leaderboard embed so it can be
    // edited in place, instead of being reposted every update.
    db.run(`
    CREATE TABLE IF NOT EXISTS leaderboard (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        channel_id TEXT,
        message_id TEXT,
        steamid TEXT,
        player_name TEXT,
        kills INTEGER DEFAULT 0,
        deaths INTEGER DEFAULT 0,
        kd_ratio REAL DEFAULT 0,
        playtime INTEGER DEFAULT 0,
        wipe_cycle TEXT,
        updated_at INTEGER
    );
    `, (err) => {
        if (err) console.error('[DB Init] Error creating leaderboard:', err);
        else console.log('[DB Init] ✓ leaderboard table created');
    });

    // Migrations for leaderboard table (in case it already existed from an
    // older schema that lacked these columns)
    db.run(`ALTER TABLE leaderboard ADD COLUMN channel_id TEXT;`, (err) => {
        if (err && !/duplicate column/i.test(err.message)) console.error('[DB Init] Error migrating leaderboard.channel_id:', err);
    });
    db.run(`ALTER TABLE leaderboard ADD COLUMN message_id TEXT;`, (err) => {
        if (err && !/duplicate column/i.test(err.message)) console.error('[DB Init] Error migrating leaderboard.message_id:', err);
    });

    // Server status table
    // NOTE: channel_id/message_id are required by establishConnection.js to
    // track which Discord message holds the server status embed so it can
    // be edited in place.
    db.run(`
    CREATE TABLE IF NOT EXISTS server_status (
        server_id TEXT NOT NULL,
        channel_id TEXT,
        message_id TEXT,
        online INTEGER DEFAULT 0,
        players_online INTEGER DEFAULT 0,
        max_players INTEGER DEFAULT 0,
        queue_count INTEGER DEFAULT 0,
        joining_count INTEGER DEFAULT 0,
        fps INTEGER DEFAULT 0,
        last_wipe INTEGER,
        map_seed TEXT,
        map_size TEXT,
        last_updated INTEGER
    );
    `, (err) => {
        if (err) console.error('[DB Init] Error creating server_status:', err);
        else console.log('[DB Init] ✓ server_status table created');
    });

    // Migrations for server_status table (in case it already existed from an
    // older schema that lacked these columns)
    db.run(`ALTER TABLE server_status ADD COLUMN channel_id TEXT;`, (err) => {
        if (err && !/duplicate column/i.test(err.message)) console.error('[DB Init] Error migrating server_status.channel_id:', err);
    });
    db.run(`ALTER TABLE server_status ADD COLUMN message_id TEXT;`, (err) => {
        if (err && !/duplicate column/i.test(err.message)) console.error('[DB Init] Error migrating server_status.message_id:', err);
    });

    // Create indexes
    db.run(`CREATE INDEX IF NOT EXISTS idx_server_logs_server_id ON server_logs(server_id);`, (err) => {
        if (err) console.error('[DB Init] Error creating index:', err);
    });
    db.run(`CREATE INDEX IF NOT EXISTS idx_server_logs_timestamp ON server_logs(timestamp);`, (err) => {
        if (err) console.error('[DB Init] Error creating index:', err);
    });
    db.run(`CREATE INDEX IF NOT EXISTS idx_player_info_last_seen ON player_info(last_seen);`, (err) => {
        if (err) console.error('[DB Init] Error creating index:', err);
    });
    db.run(`CREATE INDEX IF NOT EXISTS idx_leaderboard_server_id ON leaderboard(server_id);`, (err) => {
        if (err) console.error('[DB Init] Error creating index:', err);
    });
    db.run(`CREATE INDEX IF NOT EXISTS idx_leaderboard_wipe_cycle ON leaderboard(wipe_cycle);`, (err) => {
        if (err) console.error('[DB Init] Error creating index:', err);
        else {
            console.log('[DB Init] ✓ All indexes created');
            db.close((err) => {
                if (err) console.error('[DB Init] Error closing database:', err);
                else console.log('[DB Init] Database initialization complete!');
                process.exit(0);
            });
        }
    });
});
