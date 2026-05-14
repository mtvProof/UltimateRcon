#!/bin/sh
set -eu

REPO_DIR="${REPO_DIR:-/bot/repo}"
GIT_REPO="${GIT_REPO:-https://github.com/mtvProof/UltimateRcon.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"
LOCAL_DATABASE_DIR="${LOCAL_DATABASE_DIR:-/bot/local-database}"
LOCAL_IMAGESTORE_DIR="${LOCAL_IMAGESTORE_DIR:-/bot/local-imagestorage}"

mkdir -p "$REPO_DIR"

if [ ! -d "$REPO_DIR/.git" ]; then
    echo "[start] Cloning repository $GIT_REPO (branch: $GIT_BRANCH)"
    rm -rf "$REPO_DIR"
    git clone --branch "$GIT_BRANCH" "$GIT_REPO" "$REPO_DIR"
else
    echo "[start] Pulling latest from origin/$GIT_BRANCH"
    git -C "$REPO_DIR" fetch origin "$GIT_BRANCH"
    git -C "$REPO_DIR" reset --hard "origin/$GIT_BRANCH"
fi

cd "$REPO_DIR"

mkdir -p src/images

# Only link database and image storage (no more config files needed!)
if [ -d "$LOCAL_DATABASE_DIR" ]; then
    rm -rf "$REPO_DIR/src/database"
    ln -s "$LOCAL_DATABASE_DIR" "$REPO_DIR/src/database"
fi

if [ -d "$LOCAL_IMAGESTORE_DIR" ]; then
    rm -rf "$REPO_DIR/src/images/imagestorage"
    ln -s "$LOCAL_IMAGESTORE_DIR" "$REPO_DIR/src/images/imagestorage"
fi

echo "[start] Installing npm dependencies"
npm install --omit=dev --no-audit --no-fund
npm rebuild canvas --build-from-source

echo "[start] Running bot in ENV_ONLY mode (configuration from environment variables)"
exec npm start

