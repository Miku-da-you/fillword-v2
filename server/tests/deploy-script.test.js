const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const deployScriptPath = path.join(__dirname, "..", "deploy.sh");
const restoreScriptPath = path.join(__dirname, "..", "restore.sh");
const ecosystemConfigPath = path.join(__dirname, "..", "ecosystem.config.js");

test("deploy script prefers python3 and falls back to python for nginx patching", () => {
  const content = fs.readFileSync(deployScriptPath, "utf8");

  assert.match(content, /PYTHON_BIN="\$\(command -v python3 \|\| command -v python\)"/);
  assert.match(content, /"\$PYTHON_BIN" - <<'PY'/);
});

test("deploy script waits for health check instead of curling immediately after pm2 start", () => {
  const content = fs.readFileSync(deployScriptPath, "utf8");

  assert.match(content, /for attempt in \$\(seq 1 15\); do/);
  assert.match(content, /curl -fsS http:\/\/127\.0\.0\.1:3000\/healthz/);
  assert.match(content, /sleep 1/);
});

test("deploy script verifies the unified app entry and blocks legacy host/player urls", () => {
  const content = fs.readFileSync(deployScriptPath, "utf8");

  assert.match(content, /curl -fsS -H "Host: 117\.72\.205\.240" http:\/\/127\.0\.0\.1\/fillword\/app\.html >/);
  assert.match(content, /curl -fsS -o \/dev\/null -w "%\{http_code\}" -H "Host: 117\.72\.205\.240" http:\/\/127\.0\.0\.1\/fillword\/host\.html \| grep -qx "404"/);
  assert.match(content, /curl -fsS -o \/dev\/null -w "%\{http_code\}" -H "Host: 117\.72\.205\.240" http:\/\/127\.0\.0\.1\/fillword\/player\.html \| grep -qx "404"/);
});

test("deploy script creates a timestamped server-side backup before overwriting the app", () => {
  const content = fs.readFileSync(deployScriptPath, "utf8");

  assert.match(content, /BACKUP_ROOT="\/opt\/fillword_backups"/);
  assert.match(content, /mkdir -p "\$BACKUP_ROOT"/);
  assert.match(content, /BACKUP_NAME="\$\(date \+%Y%m%d-%H%M%S\)-fillword\.tar\.gz"/);
  assert.match(content, /tar -czf "\$BACKUP_ROOT\/\$BACKUP_NAME" -C \/opt fillword/);
});

test("deploy and restore scripts source the optional server-side Spark env file before starting pm2", () => {
  const deployContent = fs.readFileSync(deployScriptPath, "utf8");
  const restoreContent = fs.readFileSync(restoreScriptPath, "utf8");

  assert.match(deployContent, /ENV_FILE="\/etc\/fillword\/spark\.env"/);
  assert.match(deployContent, /if \[ -f "\$ENV_FILE" \]; then/);
  assert.match(deployContent, /set -a/);
  assert.match(deployContent, /\. "\$ENV_FILE"/);

  assert.match(restoreContent, /ENV_FILE="\/etc\/fillword\/spark\.env"/);
  assert.match(restoreContent, /if \[ -f "\$ENV_FILE" \]; then/);
  assert.match(restoreContent, /set -a/);
  assert.match(restoreContent, /\. "\$ENV_FILE"/);
});

test("restore script exists and restores a named backup with health checks", () => {
  assert.equal(fs.existsSync(restoreScriptPath), true);
  const content = fs.readFileSync(restoreScriptPath, "utf8");

  assert.match(content, /BACKUP_ROOT="\/opt\/fillword_backups"/);
  assert.match(content, /BACKUP_NAME="\$\{1:-\}"/);
  assert.match(content, /tar -xzf "\$BACKUP_PATH" -C \/opt/);
  assert.match(content, /pm2 start ecosystem\.config\.js/);
  assert.match(content, /curl -fsS http:\/\/127\.0\.0\.1:3000\/healthz/);
  assert.match(content, /curl -fsS -H "Host: 117\.72\.205\.240" http:\/\/127\.0\.0\.1\/fillword\/app\.html >/);
  assert.match(content, /curl -fsS -o \/dev\/null -w "%\{http_code\}" -H "Host: 117\.72\.205\.240" http:\/\/127\.0\.0\.1\/fillword\/player\.html \| grep -qx "404"/);
});

test("nginx config redirects /fillword to the unified app and returns 404 for legacy host/player urls", () => {
  const content = fs.readFileSync(path.join(__dirname, "..", "nginx.fillword.conf"), "utf8");

  assert.match(content, /location = \/fillword \{\s+return 302 \/fillword\/app\.html;/s);
  assert.match(content, /location = \/fillword\/host\.html \{\s+return 404;/s);
  assert.match(content, /location = \/fillword\/player\.html \{\s+return 404;/s);
});

test("ecosystem config leaves Spark settings to environment injection", () => {
  const content = fs.readFileSync(ecosystemConfigPath, "utf8");

  assert.match(content, /SPARK_API_PASSWORD: process\.env\.SPARK_API_PASSWORD/);
  assert.match(content, /SPARK_MODEL: process\.env\.SPARK_MODEL/);
  assert.match(content, /SPARK_API_BASE_URL: process\.env\.SPARK_API_BASE_URL/);
  assert.match(content, /SPARK_TIMEOUT_MS: process\.env\.SPARK_TIMEOUT_MS/);
});
