import os
import sys
from pathlib import Path

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
LOCAL_ARCHIVE = Path(
    os.getenv(
        "FILLWORD_LOCAL_ARCHIVE",
        r"c:\Users\Chandler Qi\Desktop\fillword_v2\fillword-fix.tar.gz",
    )
)
REMOTE_ARCHIVE = os.getenv("FILLWORD_REMOTE_ARCHIVE", "/root/fillword-fix.tar.gz")
PUBLIC_URL = os.getenv("FILLWORD_PUBLIC_URL", f"http://{HOST}/fillword")
COMMANDS = [
    f"tar -xzf {REMOTE_ARCHIVE} -C /opt/fillword",
    "cd /opt/fillword/server && npm install --omit=dev",
    "pm2 restart fillword",
    "curl -fsS http://127.0.0.1:3000/healthz",
    f"curl -I {PUBLIC_URL}/app.html",
    f'test "$(curl -sS -o /dev/null -w "%{{http_code}}" {PUBLIC_URL}/host.html)" = "404"',
    f'test "$(curl -sS -o /dev/null -w "%{{http_code}}" {PUBLIC_URL}/player.html)" = "404"',
]


def main() -> None:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=22, username=USER, password=PASSWORD, timeout=20)

    try:
        sftp = client.open_sftp()
        sftp.put(str(LOCAL_ARCHIVE), REMOTE_ARCHIVE)
        sftp.close()

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
