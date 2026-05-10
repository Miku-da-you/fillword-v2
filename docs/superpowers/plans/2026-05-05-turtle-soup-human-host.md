# Turtle Soup Human Host Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make turtle soup feel like a lenient human host, add close-state guidance for final guesses, add two new cases, and redeploy to production.

**Architecture:** Keep question adjudication as-is, but split final-guess scoring into a dedicated adjudication path that can use AI-first structured reasoning with rule fallback. Extend case metadata with core-fact groups and close hints so local fallback remains human-friendly and deterministic.

**Tech Stack:** Node.js, Express, Socket.IO, xAI Spark integration, Node test runner, PM2, Nginx

---

### Task 1: Define the new guess-adjudication data model

**Files:**
- Modify: `server/turtle-soup/cases.js`
- Test: `server/tests/turtle-soup-manager.test.js`

- [ ] Add `coreFacts`, `requiredFactGroups`, and `closeHint` to existing turtle cases.
- [ ] Add two brand-new turtle soup cases with the same structure and a clear causal chain.
- [ ] Extend tests so case fixtures prove the new metadata exists.

### Task 2: Implement final-guess adjudication

**Files:**
- Create: `server/turtle-soup/final-guess-adjudicator.js`
- Modify: `server/turtle-soup/manager.js`
- Modify: `server/turtle-soup/scoring.js`
- Test: `server/tests/turtle-soup-final-guess.test.js`

- [ ] Add a dedicated adjudicator that returns `solved`, `close`, or `wrong`.
- [ ] Use AI structured output when available.
- [ ] Add deterministic fallback using `requiredFactGroups`.
- [ ] Update manager flow so `close` keeps the room in `asking` and stores a host-style hint.

### Task 3: Surface host-style feedback in room state and UI

**Files:**
- Modify: `server/turtle-soup/manager.js`
- Modify: `public/scripts/renderers/turtle-renderer.js`
- Test: `server/tests/turtle-renderer.test.js`

- [ ] Expose latest guess feedback in room state.
- [ ] Render “you are close, add the final reason” feedback for players.
- [ ] Keep solved and abandoned states unchanged.

### Task 4: Cover behavior with tests

**Files:**
- Create: `server/tests/turtle-soup-final-guess.test.js`
- Modify: `server/tests/turtle-soup-manager.test.js`

- [ ] Add tests for `solved` when core causal chain is captured without exact wording.
- [ ] Add tests for `close` when the player misses one final causal factor.
- [ ] Add tests for `wrong` when the guess misses the central logic.
- [ ] Add tests proving new cases are available in content summaries.

### Task 5: Deploy and verify production

**Files:**
- Modify: `fillword-deploy.tar.gz` output via packaging step only

- [ ] Run `npm test` locally and confirm all tests pass.
- [ ] Repackage deployment archive.
- [ ] Deploy to JD Cloud with the existing remote deploy script.
- [ ] Verify `app.html` is `200` and legacy `host/player` URLs stay `404`.
- [ ] Run real remote multiplayer smoke tests for turtle soup and ghost story.
