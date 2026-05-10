import os
import sys

import paramiko


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="ignore")


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


HOST = require_env("FILLWORD_SSH_HOST")
USER = require_env("FILLWORD_SSH_USER")
PASSWORD = require_env("FILLWORD_SSH_PASSWORD")
PUBLIC_URL = os.getenv("FILLWORD_PUBLIC_URL", f"http://{HOST}/fillword")

COMMANDS = [
    """python3 - <<'PY'
from pathlib import Path

conf = Path('/www/server/panel/vhost/nginx/smartresume.conf')
text = conf.read_text(encoding='utf-8')
text = text.replace('proxy_pass http://127.0.0.1:3000/;', 'proxy_pass http://127.0.0.1:3000/fillword/;')
if 'location /healthz {' not in text:
    marker = '    location /api/ {\\n'
    block = (
        '    location /healthz {\\n'
        '        proxy_pass http://127.0.0.1:3000/healthz;\\n'
        '        proxy_set_header Host $host;\\n'
        '    }\\n\\n'
    )
    text = text.replace(marker, block + marker)
conf.write_text(text, encoding='utf-8')
PY""",
    "nginx -t",
    "nginx -s reload",
    "pkill -f 'cd /opt/fillword && PORT=3000 nohup node server.js' || true",
    "pkill -f '/opt/fillword/server.js' || true",
    "pkill -f 'node server.js' || true",
    "pm2 restart fillword",
    "pm2 status",
    "curl -fsS http://127.0.0.1:3000/healthz",
    "curl -I http://127.0.0.1/fillword/host.html",
    f"curl -I {PUBLIC_URL}/host.html",
]


def main() -> None:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=22, username=USER, password=PASSWORD, timeout=20)
    try:
        for command in COMMANDS:
            print(f"CMD: {command}")
            stdin, stdout, stderr = client.exec_command(command, get_pty=True, timeout=1200)
            out = stdout.read().decode("utf-8", "ignore")
            err = stderr.read().decode("utf-8", "ignore")
            if out.strip():
                print(out)
            if err.strip():
                print("ERR:")
                print(err)
    finally:
        client.close()


if __name__ == "__main__":
    main()
