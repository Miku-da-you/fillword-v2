#!/bin/bash
set -euo pipefail

APP_ROOT="/opt/fillword"
SERVER_DIR="$APP_ROOT/server"
PANEL_NGINX_CONF="/www/server/panel/vhost/nginx/smartresume.conf"
PYTHON_BIN="$(command -v python3 || command -v python)"

echo "[1/5] 检查运行环境"
node -v
npm -v

echo "[2/5] 安装 pm2 和服务依赖"
npm install -g pm2
cd "$SERVER_DIR"
npm install --omit=dev

echo "[3/5] 启动或重启 Fillword"
pkill -f "/opt/fillword/server.js" >/dev/null 2>&1 || true
pkill -f "/opt/fillword/server/server.js" >/dev/null 2>&1 || true
pm2 delete fillword >/dev/null 2>&1 || true
pm2 start ecosystem.config.js
pm2 save

echo "[4/5] 修正 nginx 反向代理"
"$PYTHON_BIN" - <<'PY'
from pathlib import Path

conf_path = Path("/www/server/panel/vhost/nginx/smartresume.conf")
text = conf_path.read_text(encoding="utf-8")
text = text.replace("proxy_pass http://127.0.0.1:3000/;", "proxy_pass http://127.0.0.1:3000/fillword/;")
if "location /healthz" not in text:
    marker = "    location /api/ {\n"
    health_block = (
        "    location /healthz {\n"
        "        proxy_pass http://127.0.0.1:3000/healthz;\n"
        "        proxy_set_header Host $host;\n"
        "    }\n\n"
    )
    text = text.replace(marker, health_block + marker)
conf_path.write_text(text, encoding="utf-8")
PY

nginx -t
nginx -s reload

echo "[5/5] 健康检查"
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
curl -fsS -H "Host: 117.72.205.240" http://127.0.0.1/fillword/host.html >/dev/null
curl -fsS -H "Host: 117.72.205.240" http://127.0.0.1/fillword/player.html >/dev/null

echo "部署完成"
echo "主持人入口: http://117.72.205.240/fillword/host.html"
echo "玩家入口: http://117.72.205.240/fillword/player.html"
echo "1.1 模式: Fillword / 海龟汤 / 恐怖怪谈"
