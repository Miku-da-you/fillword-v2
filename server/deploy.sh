#!/bin/bash
set -euo pipefail

APP_ROOT="/opt/fillword"
SERVER_DIR="$APP_ROOT/server"
PANEL_NGINX_CONF="/www/server/panel/vhost/nginx/smartresume.conf"
PYTHON_BIN="$(command -v python3 || command -v python)"
BACKUP_ROOT="/opt/fillword_backups"
BACKUP_NAME="$(date +%Y%m%d-%H%M%S)-fillword.tar.gz"
KEEP_BACKUPS=5
ENV_FILE="/etc/fillword/spark.env"

echo "[0/6] 备份当前版本"
mkdir -p "$BACKUP_ROOT"
if [ -d "$APP_ROOT" ]; then
  tar -czf "$BACKUP_ROOT/$BACKUP_NAME" -C /opt fillword
  printf '%s\n' "$BACKUP_NAME" > "$BACKUP_ROOT/latest"
  find "$BACKUP_ROOT" -maxdepth 1 -type f -name '*-fillword.tar.gz' | sort -r | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm -f
fi

echo "[1/6] 检查运行环境"
node -v
npm -v

echo "[2/6] 安装 pm2 和服务依赖"
npm install -g pm2
cd "$SERVER_DIR"
npm install --omit=dev

echo "[3/6] 启动或重启 Fillword"
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

echo "[4/6] 修正 nginx 反向代理"
"$PYTHON_BIN" - <<'PY'
from pathlib import Path

conf_path = Path("/www/server/panel/vhost/nginx/smartresume.conf")
text = conf_path.read_text(encoding="utf-8")
text = text.replace("proxy_pass http://127.0.0.1:3000/;", "proxy_pass http://127.0.0.1:3000/fillword/;")
text = text.replace("return 302 /fillword/host.html;", "return 302 /fillword/app.html;")
if "location /healthz" not in text:
    marker = "    location /api/ {\n"
    health_block = (
        "    location /healthz {\n"
        "        proxy_pass http://127.0.0.1:3000/healthz;\n"
        "        proxy_set_header Host $host;\n"
        "    }\n\n"
    )
    text = text.replace(marker, health_block + marker)
if "location = /fillword/host.html" not in text:
    marker = "    location /fillword/ {\n"
    deny_block = (
        "    location = /fillword/host.html {\n"
        "        return 404;\n"
        "    }\n\n"
        "    location = /fillword/player.html {\n"
        "        return 404;\n"
        "    }\n\n"
    )
    text = text.replace(marker, deny_block + marker)
conf_path.write_text(text, encoding="utf-8")
PY

nginx -t
nginx -s reload

echo "[5/6] 健康检查"
for attempt in $(seq 1 15); do
  if curl -fsS http://127.0.0.1:3000/healthz >/dev/null; then
    break
  fi

  if [ "$attempt" -eq 15 ]; then
    echo "服务启动超时，健康检查未通过"
    exit 1
  fi

  sleep 1
done

curl -fsS http://127.0.0.1:3000/healthz
curl -fsS -H "Host: 117.72.205.240" http://127.0.0.1/fillword/app.html >/dev/null
curl -fsS -o /dev/null -w "%{http_code}" -H "Host: 117.72.205.240" http://127.0.0.1/fillword/host.html | grep -qx "404"
curl -fsS -o /dev/null -w "%{http_code}" -H "Host: 117.72.205.240" http://127.0.0.1/fillword/player.html | grep -qx "404"

echo "[6/6] 备份完成"
echo "当前备份: $BACKUP_ROOT/$BACKUP_NAME"
echo "部署完成"
echo "统一入口: http://117.72.205.240/fillword/app.html"
