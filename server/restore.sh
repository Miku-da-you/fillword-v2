#!/bin/bash
set -euo pipefail

APP_ROOT="/opt/fillword"
SERVER_DIR="$APP_ROOT/server"
BACKUP_ROOT="/opt/fillword_backups"
BACKUP_NAME="${1:-}"
BACKUP_PATH="$BACKUP_ROOT/$BACKUP_NAME"
ROLLBACK_SNAPSHOT="$(date +%Y%m%d-%H%M%S)-pre-restore-fillword.tar.gz"
ENV_FILE="/etc/fillword/spark.env"

if [ -z "$BACKUP_NAME" ]; then
  echo "用法: bash restore.sh <backup-name>"
  exit 1
fi

if [ ! -f "$BACKUP_PATH" ]; then
  echo "备份不存在: $BACKUP_PATH"
  exit 1
fi

mkdir -p "$BACKUP_ROOT"
if [ -d "$APP_ROOT" ]; then
  tar -czf "$BACKUP_ROOT/$ROLLBACK_SNAPSHOT" -C /opt fillword
fi

rm -rf "$APP_ROOT"
mkdir -p /opt
tar -xzf "$BACKUP_PATH" -C /opt

cd "$SERVER_DIR"
npm install --omit=dev
pkill -f "/opt/fillword/server.js" >/dev/null 2>&1 || true
pkill -f "/opt/fillword/server/server.js" >/dev/null 2>&1 || true
pm2 delete fillword >/dev/null 2>&1 || true
if [ -f "$ENV_FILE" ]; then
  set -a
  . "$ENV_FILE"
  set +a
fi
pm2 start ecosystem.config.js
pm2 save

for attempt in $(seq 1 15); do
  if curl -fsS http://127.0.0.1:3000/healthz >/dev/null; then
    break
  fi

  if [ "$attempt" -eq 15 ]; then
    echo "恢复后健康检查未通过"
    exit 1
  fi

  sleep 1
done

curl -fsS http://127.0.0.1:3000/healthz
curl -fsS -H "Host: 117.72.205.240" http://127.0.0.1/fillword/app.html >/dev/null
curl -fsS -o /dev/null -w "%{http_code}" -H "Host: 117.72.205.240" http://127.0.0.1/fillword/host.html | grep -qx "404"
curl -fsS -o /dev/null -w "%{http_code}" -H "Host: 117.72.205.240" http://127.0.0.1/fillword/player.html | grep -qx "404"

echo "恢复完成"
echo "已恢复备份: $BACKUP_PATH"
echo "恢复前快照: $BACKUP_ROOT/$ROLLBACK_SNAPSHOT"
