const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const workspaceRoot = path.join(__dirname, "..", "..");

test("templates script exposes TEMPLATES on window for browser pages", () => {
  const scriptPath = path.join(workspaceRoot, "public", "scripts", "shared", "templates.js");
  const source = fs.readFileSync(scriptPath, "utf8");
  const sandbox = {
    window: {},
    module: { exports: {} },
    console
  };

  vm.runInNewContext(source, sandbox, { filename: scriptPath });

  assert.ok(Array.isArray(sandbox.window.TEMPLATES));
  assert.ok(sandbox.window.TEMPLATES.length >= 6);
});

test("single app entry exposes the shared shell and loads the unified app script", () => {
  const appHtmlPath = path.join(workspaceRoot, "public", "app.html");
  const html = fs.readFileSync(appHtmlPath, "utf8");

  assert.match(html, /id="page-landing"/);
  assert.match(html, /id="page-room"/);
  assert.match(html, /id="page-result"/);
  assert.match(html, /\.\/scripts\/pages\/app\.js/);
  assert.doesNotMatch(html, /即将接入|即将开放/);
});

test("app socket exposes the unified mode actions for turtle and ghost flows", () => {
  const scriptPath = path.join(workspaceRoot, "public", "scripts", "shared", "app-socket.js");
  const source = fs.readFileSync(scriptPath, "utf8");
  const calls = [];
  const sandbox = {
    window: {
      FillwordSocket: {
        connect() {},
        createRoom() {},
        disconnect() {},
        joinRoom() {},
        submitAnswers() {},
        generateResult() {},
        closeRoom() {},
        leaveRoom() {},
        onRoomClosed() {},
        onRoomState() {},
        onResultGenerated() {},
        emit(eventName, payload) {
          calls.push({ eventName, payload });
        }
      },
      FillwordIdentity: {
        getClientId() {
          return "client-1";
        }
      }
    },
    console
  };

  vm.runInNewContext(source, sandbox, { filename: scriptPath });

  const api = sandbox.window.FillwordAppSocket;
  assert.equal(typeof api.startRoom, "function");
  assert.equal(typeof api.submitTurtleQuestion, "function");
  assert.equal(typeof api.submitTurtleGuess, "function");
  assert.equal(typeof api.submitGhostAnswers, "function");
});
