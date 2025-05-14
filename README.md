# spacebar docker

An easy-to-use full [spacebar](https://spacebar.chat/) and [JankClient](https://github.com/MathMan05/JankClient)
setup for self-hosting.

## How to use

I recommend you use two different domains - one for the spacebar server and one for the client.

1. Clone this repository
2. Copy `.env.example` to `.env` and configure environment variables
3. Copy `docker-compose.override.yml.example` to `docker-compose.override.yml` and configure the exposed ports
4. Run `mkdir -p {client,server}-data && docker compose up -d` to start everything

After the last command has finished executing, the client should be accessible
at [127.0.0.1:4265](http://127.0.0.1:4265/), or whatever you have configured in `docker-compose.override.yml`.

I recommend you use a webserver (e.g. [Caddy](https://caddyserver.com/)) to expose the server and the client
with a proper SSL certificate.
