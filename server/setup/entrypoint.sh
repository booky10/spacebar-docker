#!/usr/bin/env ash

set -e

# copy initial badge icons to data directory
if [ ! -d "/data/files/badge-icons" ]; then
  mkdir -p "/data/files"
	cp -rv "/setup/badge-icons" "/data/files/badge-icons"
fi

# run database configuration script
echo "Pre-configuring database..."
env NODE_PATH=/setup/entrypoint/node_modules node "/setup/entrypoint/config.mjs" "$@"

# launch spacebar server
exec "$@"
