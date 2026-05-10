const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(port, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (response.ok) return;
    } catch (_error) {
    }
    await wait(150);
  }
  throw new Error("Server did not become healthy in time");
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null || child.killed) return;
  child.kill();

  const exited = await Promise.race([
    new Promise(resolve => child.once("exit", () => resolve(true))),
    wait(1500).then(() => false),
  ]);

  if (!exited && process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    await new Promise(resolve => killer.once("exit", resolve));
    await wait(200);
  }
}

test("server exposes turtle and ghost content summaries for the unified app", { timeout: 15000 }, async () => {
  const port = 3115;
  const serverProcess = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, PORT: String(port) },
    stdio: "ignore"
  });

  try {
    await waitForServer(port);
    const response = await fetch(`http://127.0.0.1:${port}/fillword/content-manifest`);
    assert.equal(response.status, 200);

    const data = await response.json();
    assert.ok(Array.isArray(data.turtleCases));
    assert.ok(Array.isArray(data.ghostPacks));
    assert.ok(data.turtleCases.some(item => item.id === "late-night-elevator"));
    assert.ok(data.ghostPacks.some(item => item.id === "dormitory-rule-13"));
  } finally {
    await stopProcess(serverProcess);
  }
});
