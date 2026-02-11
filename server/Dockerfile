FROM        --platform=$TARGETOS/$TARGETARCH node:22 AS builder

# setup build env (build deps are for building erlpack)
RUN         apt-get update && apt-get install -y git python3 make clang \
              && useradd -m -d /home/builder builder
USER        builder
ENV         USER=builder HOME=/home/builder

# clone sourcecode
RUN         git clone https://github.com/spacebarchat/server.git /home/builder/work
WORKDIR     /home/builder/work

RUN         npm ci \
              # remove erlpack first to make it actually build its binaries \
              && npm r @yukikaze-bot/erlpack \
              # explicitly upgrade amqplib as the version used by spacebar \
              # doesn't work with never rabbitmq versions; \
              # install sharp for image proxying - jimp is really slow in comparison, according to benchmarks \
              # install medooze webrtc library as the webrtc mediaserver implementation \
              && npm i amqplib @yukikaze-bot/erlpack sharp @spacebarchat/medooze-webrtc \
              # compile spacebar server \
              && npm run setup

# runtime image
FROM        --platform=$TARGETOS/$TARGETARCH node:22

# setup runtime dependencies
RUN         apt-get update && apt-get install -y git

# some image meta stuff
LABEL       author="booky" maintainer="booky@booky.dev"
LABEL       org.opencontainers.image.source="https://git.hserv.org/booky/spacebar-docker"
LABEL       org.opencontainers.image.licenses=MIT

# copy spacebar server files
COPY        --from=builder --chown=node:node /home/builder/work /app
USER        node

COPY        --chown=node:node ./setup /setup/entrypoint
WORKDIR     /setup/entrypoint
RUN         npm ci

COPY        --chown=node:node ./badge-icons /setup/badge-icons
WORKDIR     /data

# configure webrtc library
ENV         WRTC_LIBRARY=@spacebarchat/medooze-webrtc
ENV         WRTC_WS_PORT=8081
EXPOSE      8081

ENV         PORT=8080
EXPOSE      8080

# specify app location for startup
ENTRYPOINT  ["env", "NODE_PATH=/app/node_modules", "NODE_ENV=production", "/bin/sh", "/setup/entrypoint/entrypoint.sh"]
CMD         ["/usr/local/bin/node", "/app/dist/bundle/start.js"]
