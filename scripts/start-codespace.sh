#!/usr/bin/env bash
set -euo pipefail

: "${HYDRADB_AUTH_TOKEN:?HYDRADB_AUTH_TOKEN must be set}"
: "${PASSWORD_PEPPER:?PASSWORD_PEPPER must be set}"
: "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID must be set}"
: "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY must be set}"
: "${R2_BUCKET:?R2_BUCKET must be set}"
: "${R2_ENDPOINT:?R2_ENDPOINT must be set}"

if [[ -n "${CODESPACE_NAME:-}" && -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]]; then
  export APP_ORIGIN="https://${CODESPACE_NAME}-5173.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
fi
: "${APP_ORIGIN:?APP_ORIGIN could not be determined}"

mkdir -p .codespaces
umask 077
printf '%s\n' "$HYDRADB_AUTH_TOKEN" > .codespaces/hydradb-token

docker compose up -d --build --force-recreate
docker compose ps
printf 'Frontend origin: %s\n' "$APP_ORIGIN"
