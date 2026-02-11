#!/usr/bin/env sh

set -e

# copy the default instances.json file if it doesn't exist yet
if [ ! -e "$JANK_INSTANCES_PATH" ]; then
  SUBSTITUTED_INSTANCES="$(envsubst < "/setup/jank-extra-instances.json")"
  echo "$SUBSTITUTED_INSTANCES" | jq -rs '[.[][]]' "-" "/app/dist/webpage/instances.json" > "$JANK_INSTANCES_PATH"
fi

# launch jank client
exec "$@"
