#!/bin/sh
set -eu

REPO_DIR="${REPO_DIR:-/bot}"
GIT_REPO="${GIT_REPO:-https://github.com/mtvProof/UltimateRcon.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"
LOCAL_DATABASE_DIR="${LOCAL_DATABASE_DIR:-/data/database}"
LOCAL_IMAGESTORE_DIR="${LOCAL_IMAGESTORE_DIR:-/data/imagestorage}"

mkdir -p "$REPO_DIR"

if [ ! -d "$REPO_DIR/.git" ]; then
    echo "[start] Cloning repository $GIT_REPO (branch: $GIT_BRANCH)"
    # Don't use rm -rf, instead just clone into the directory
    # This prevents issues with mounted volumes
    git clone --branch "$GIT_BRANCH" "$GIT_REPO" "$REPO_DIR"
else
    echo "[start] Pulling latest from origin/$GIT_BRANCH"
    git -C "$REPO_DIR" fetch origin "$GIT_BRANCH"
    git -C "$REPO_DIR" reset --hard "origin/$GIT_BRANCH"
fi

cd "$REPO_DIR"

mkdir -p src/images

# Only link database and image storage (no more config files needed!)
# Check if it's already a symlink or mounted, if not create symlink
if [ -d "$LOCAL_DATABASE_DIR" ]; then
    if [ ! -L "$REPO_DIR/src/database" ] && [ ! -d "$REPO_DIR/src/database" ]; then
        ln -s "$LOCAL_DATABASE_DIR" "$REPO_DIR/src/database"
    elif [ -d "$REPO_DIR/src/database" ] && [ ! -L "$REPO_DIR/src/database" ]; then
        rm -rf "$REPO_DIR/src/database"
        ln -s "$LOCAL_DATABASE_DIR" "$REPO_DIR/src/database"
    fi
fi

if [ -d "$LOCAL_IMAGESTORE_DIR" ]; then
    if [ ! -L "$REPO_DIR/src/images/imagestorage" ] && [ ! -d "$REPO_DIR/src/images/imagestorage" ]; then
        ln -s "$LOCAL_IMAGESTORE_DIR" "$REPO_DIR/src/images/imagestorage"
    elif [ -d "$REPO_DIR/src/images/imagestorage" ] && [ ! -L "$REPO_DIR/src/images/imagestorage" ]; then
        rm -rf "$REPO_DIR/src/images/imagestorage"
        ln -s "$LOCAL_IMAGESTORE_DIR" "$REPO_DIR/src/images/imagestorage"
    fi
fi

echo "[start] Installing npm dependencies"
npm install --omit=dev --no-audit --no-fund
npm rebuild canvas --build-from-source

echo "[start] Running bot in ENV_ONLY mode (configuration from environment variables)"
exec npm start

