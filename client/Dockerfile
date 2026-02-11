FROM        --platform=$TARGETOS/$TARGETARCH node:24-alpine AS builder

# setup build env
RUN         apk add --update --no-cache git \
              && adduser -D -h /home/builder builder
USER        builder
ENV         USER=builder HOME=/home/builder

# clone sourcecode
RUN         git clone https://github.com/MathMan05/Fermi.git /home/builder/work
WORKDIR     /home/builder/work

# install dependencies and build server (lockfile is missing?)
RUN         npm i && npm run build

# runtime image
FROM        --platform=$TARGETOS/$TARGETARCH node:24-alpine

# some image meta stuff
LABEL       author="booky" maintainer="booky@booky.dev"
LABEL       org.opencontainers.image.source="https://git.hserv.org/booky/spacebar-docker"
LABEL       org.opencontainers.image.licenses=MIT

# copy jank client files
COPY        --from=builder --chown=node:node /home/builder/work /app
USER        node

# move data files to data directory
WORKDIR     /data
ENV         JANK_INSTANCES_PATH=/data/instances.json
ENV         JANK_UPTIME_JSON_PATH=/data/uptime.json
# initializes instances.json if it doesn't exist already
COPY        ./entrypoint.sh /setup/jank-entrypoint.sh

ENV         PORT=8080
EXPOSE      8080

# specify app location for startup
ENTRYPOINT  ["env", "NODE_PATH=/app/node_modules", "NODE_ENV=production", "/bin/ash", "/setup/jank-entrypoint.sh"]
CMD         ["/usr/local/bin/node", "/app/dist/index.js"]
