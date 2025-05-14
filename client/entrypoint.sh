#!/usr/bin/env ash

set -e

# copy the default instances.json file if it doesn't exist yet
if [ ! -e "$JANK_INSTANCES_PATH" ]; then
	cp -v "/app/dist/webpage/instances.json" "$JANK_INSTANCES_PATH"
fi

# launch jank client
exec "$@"
