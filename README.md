# Fillword Party

> A realtime party game project with three modes: `Fillword`, `Turtle Soup`, and `Ghost Story`.

[![Node.js](https://img.shields.io/badge/Node.js-16%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-realtime-010101?logo=socket.io&logoColor=white)](https://socket.io/)
[![Status](https://img.shields.io/badge/status-active-2ea44f)](https://github.com/Miku-da-you/fillword-v2)
[![Deploy](https://img.shields.io/badge/deploy-PM2%20%2B%20Nginx-blue)](./docs/deployment/fillword-jdcloud.md)

Fillword Party is a browser-based multiplayer game hub built for small groups and party sessions. One project, one room flow, three game styles:

- `Fillword`: players fill distributed prompts and the host generates a final combined result.
- `Turtle Soup`: players ask free-form yes/no questions and try to solve a lateral-thinking mystery.
- `Ghost Story`: players read chapters, answer questions, and unlock different endings.

Online entry:

- App: [http://117.72.205.240/fillword/app.html](http://117.72.205.240/fillword/app.html)
- Health check: [http://117.72.205.240/healthz](http://117.72.205.240/healthz)

## Highlights

- Unified mobile-first app entry for host and players
- Realtime room sync powered by `Socket.IO`
- Multiple game modes sharing one room code experience
- AI-assisted `Turtle Soup` moderation with rule-based fallback
- AI-assisted `Ghost Story` narration with deterministic progression
- PM2 + Nginx deployment flow for a single Linux server
- Repository cleaned for open source: no server password or AI API key stored in source

## Game Modes

### 1. Fillword

This is the original collaborative word-filling party mode.

- The host creates a room and chooses a template.
- Each player receives different prompt fields.
- Players submit their answers independently.
- Once everyone is done, the host generates a combined result script.

Best for:

- quick party rounds
- funny collaborative writing
- improv-style social games

### 2. Turtle Soup

This mode turns the app into a hosted lateral-thinking mystery game.

- The host chooses a case pack and starts the room.
- Players freely ask natural-language questions.
- The moderator answers with `yes`, `no`, `close`, or `irrelevant`.
- Obvious off-topic questions are blocked before they derail the round.
- Strong keyword matches are resolved deterministically before AI is consulted.

Recent moderation improvements:

- unrelated chat like `Can you sing?` is rejected as `irrelevant`
- answer-fishing meta questions are blocked
- clear clue-matching questions are answered through rule-first adjudication
- AI remains available for flexible judging when the question is relevant but not an exact rule hit

### 3. Ghost Story

This mode is a chapter-based horror reasoning experience.

- The host selects a story pack.
- Players read scene text and answer chapter questions.
- Correctness affects survival, progression, and endings.
- AI narration can enrich intros and endings while the game logic remains deterministic.

Best for:

- atmospheric group play
- short branching story sessions
- rule-horror and puzzle storytelling

## Tech Stack

- Frontend: vanilla HTML, CSS, JavaScript
- Backend: Node.js, Express, Socket.IO
- Process management: PM2
- Reverse proxy: Nginx
- AI integration: Spark HTTP chat completions API
- Tests: Node built-in test runner

## Quick Start

### Requirements

- Node.js `16+`
- npm

### Install

```bash
cd server
npm install
```

### Run locally

```bash
cd server
npm start
```

Then open:

- `http://127.0.0.1:3000/fillword/app.html`

### Development mode

```bash
cd server
npm run dev
```

### Run tests

```bash
cd server
npm test
```

## Environment Variables

AI and deployment secrets are intentionally not committed to the repository.

Use [.env.example](./.env.example) as a reference for deployment-side values:

```env
FILLWORD_SSH_HOST=example.com
FILLWORD_SSH_USER=root
FILLWORD_SSH_PASSWORD=replace-me
FILLWORD_PUBLIC_HOST=example.com
FILLWORD_PUBLIC_URL=http://example.com/fillword
FILLWORD_LOCAL_ARCHIVE=C:\path\to\fillword-deploy.tar.gz
FILLWORD_REMOTE_ARCHIVE=/root/fillword-deploy.tar.gz
```

For AI features, the server expects environment variables such as:

- `SPARK_API_PASSWORD`
- `SPARK_MODEL`
- `SPARK_API_BASE_URL`
- `SPARK_TIMEOUT_MS`

Detailed AI setup:

- [docs/deployment/fillword-ai-config.md](./docs/deployment/fillword-ai-config.md)
- [docs/deployment/fillword-spark-model-name.md](./docs/deployment/fillword-spark-model-name.md)

## Deployment

The current deployment target is a Linux server using PM2 and Nginx.

High-level flow:

1. Package the project
2. Upload it to the server
3. Run `server/deploy.sh`
4. Restart PM2
5. Verify `/healthz` and `/fillword/app.html`

Relevant files:

- [server/deploy.sh](./server/deploy.sh)
- [server/restore.sh](./server/restore.sh)
- [server/ecosystem.config.js](./server/ecosystem.config.js)
- [docs/deployment/fillword-jdcloud.md](./docs/deployment/fillword-jdcloud.md)
- [docs/deployment/fillword-backup-restore.md](./docs/deployment/fillword-backup-restore.md)

Helper scripts in the repo now read SSH credentials from environment variables instead of hardcoded secrets:

- [deploy_remote_fillword.py](./deploy_remote_fillword.py)
- [deploy_fix_remote.py](./deploy_fix_remote.py)
- [cutover_fillword.py](./cutover_fillword.py)

## Project Structure

```text
fillword_v2/
|- public/                 # Unified frontend entry and browser assets
|  |- app.html
|  |- scripts/
|  |  |- pages/
|  |  |- renderers/
|  |  `- shared/
|  `- styles/
|- server/                 # Express + Socket.IO backend
|  |- turtle-soup/         # Turtle Soup game logic
|  |- ghost-story/         # Ghost Story game logic
|  |- integrations/        # Spark client
|  |- tests/               # Automated tests
|  `- server.js
|- docs/                   # Deployment notes, handover docs, specs
|- dist/                   # Built/static deployment artifacts
|- _rollback_1_0/          # Clean baseline snapshot from an earlier version
`- .env.example            # Safe env template
```

## Realtime Flow

At a high level, the app works like this:

1. The host creates a room from the unified app entry.
2. The backend creates a room in the matching mode manager.
3. Players join using the same room code flow.
4. Socket events broadcast room state changes to each connected client.
5. Mode-specific renderers update the UI based on role, state, and result.

The main server entry is [server/server.js](./server/server.js).

## Current Status

What is already in place:

- unified app entry is live
- Fillword room flow is working
- Turtle Soup includes AI moderation plus rule fallback
- Ghost Story includes chapter progression and ending resolution
- automated backend and contract tests are in place
- public GitHub repository is live and secrets have been scrubbed

## Security Notes

- No server password is stored in this repository
- No AI API key is stored in this repository
- Deployment helpers now require environment-provided credentials
- Spark credentials should be injected on the server, not committed to source

If you fork this project, keep all secrets in your own environment or secret manager.

## Repository Links

- GitHub: [https://github.com/Miku-da-you/fillword-v2](https://github.com/Miku-da-you/fillword-v2)
- Live app: [http://117.72.205.240/fillword/app.html](http://117.72.205.240/fillword/app.html)

## Notes

- The production server currently runs on Node.js 16.
- PM2 may emit engine warnings on install, but the current deployment is still operational.
- This repo does not currently include a dedicated open-source `LICENSE` file.
