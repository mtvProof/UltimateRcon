FROM node:20-bookworm

WORKDIR /opt/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    librsvg2-dev \
    python3 \
    git \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

ENV REPO_DIR=/bot

ENTRYPOINT ["/usr/local/bin/start.sh"]
