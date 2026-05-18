-- Database initialization script for Ultimate Rcon
-- Run this to create missing tables

CREATE TABLE IF NOT EXISTS server_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id TEXT NOT NULL UNIQUE,
    current_players INTEGER DEFAULT 0,
    peak_players INTEGER DEFAULT 0,
    last_wipe INTEGER DEFAULT 0,
    joining_players INTEGER DEFAULT 0,
    queued_players INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS player_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id TEXT NOT NULL,
    steam_id TEXT NOT NULL,
    name TEXT,
    profile_url TEXT,
    picture TEXT,
    connections INTEGER DEFAULT 0,
    chat_messages INTEGER DEFAULT 0,
    wipe_kills INTEGER DEFAULT 0,
    wipe_deaths INTEGER DEFAULT 0,
    lifetime_kills INTEGER DEFAULT 0,
    lifetime_deaths INTEGER DEFAULT 0,
    report_count INTEGER DEFAULT 0,
    ignore_f7_against INTEGER DEFAULT 0,
    ignore_f7_from INTEGER DEFAULT 0,
    checker_whitelisted INTEGER DEFAULT 0,
    UNIQUE(server_id, steam_id)
);

CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    server_id TEXT NOT NULL,
    UNIQUE(channel_id, server_id)
);

CREATE TABLE IF NOT EXISTS server_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    server_id TEXT NOT NULL,
    UNIQUE(channel_id, server_id)
);

-- Insert initial server_logs entries for configured servers
INSERT OR IGNORE INTO server_logs (server_id, current_players, peak_players, last_wipe)
VALUES ('server1', 0, 0, 0);

INSERT OR IGNORE INTO server_logs (server_id, current_players, peak_players, last_wipe)
VALUES ('server2', 0, 0, 0);
