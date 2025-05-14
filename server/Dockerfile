FROM        --platform=$TARGETOS/$TARGETARCH node:22-alpine AS builder

# setup build env (build deps are for building erlpack)
RUN         apk add --update --no-cache git python3 make g++ \
              && adduser -D -h /home/builder builder
USER        builder
ENV         USER=builder HOME=/home/builder

# clone sourcecode
RUN         git clone https://github.com/spacebarchat/server.git /home/builder/work
WORKDIR     /home/builder/work

RUN         npm ci \
              # remove erlpack first to make it actually build its binaries
              && npm r @yukikaze-bot/erlpack \
              # explicitly upgrade amqplib as the version used by spacebar \
              # doesn't work with never rabbitmq versions; \
              # install sharp for image proxying - jimp is really slow in comparison, according to benchmarks
              && npm i amqplib @yukikaze-bot/erlpack sharp \
              # compile spacebar server
              && npm run setup

# runtime image
FROM        --platform=$TARGETOS/$TARGETARCH node:22-alpine

# setup runtime dependencies
RUN         apk add --update --no-cache git

# some image meta stuff
LABEL       author="booky10" maintainer="boooky10@gmail.com"
LABEL       org.opencontainers.image.source="https://git.booky.dev/tpa/spacebar-docker"
LABEL       org.opencontainers.image.licenses=MIT

# copy spacebar server files
COPY        --from=builder --chown=node:node /home/builder/work /app
USER        node

COPY        --chown=node:node ./setup /setup/entrypoint
WORKDIR     /setup/entrypoint
RUN         npm ci

COPY        --chown=node:node ./badge-icons /setup/badge-icons
WORKDIR     /data

ENV         PORT=8080
EXPOSE      8080

# specify app location for startup
ENTRYPOINT  ["env", "NODE_PATH=/app/node_modules", "NODE_ENV=production", "/bin/ash", "/setup/entrypoint/entrypoint.sh"]
CMD         ["/usr/local/bin/node", "/app/dist/bundle/start.js"]
