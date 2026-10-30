# Chrome Shopping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Downloadable Chrome extension transferring NPC shopping quantities from Ygg Alchemy to the game shop, leaving purchase confirmation manual.

**Architecture:** Existing calculator supplies its computed missing totals through a small page bridge. Manifest V3 content scripts, a validating service worker and local storage coordinate a single pending list. A conservative DOM adapter matches exact normalized names and emits input/change without submitting purchases.

**Tech Stack:** JavaScript, Chrome Manifest V3, Node test runner, jsdom for DOM tests, Python zipfile for reproducible packaging.

**Spec:** docs/superpowers/specs/2026-10-30-chrome-shopping-design.md

## Global Constraints

- Only calculator and jogo.yggidle.com.br host access; no clipboard or purchase API.
- Manual purchase confirmation. Keep unrelated cart entries.
- Use current missing quantities, including carried bowls; retain numeric precision.
- Real-game WebGL2 test is unavailable in this environment; state limitation honestly.

## Review Focus

- Hidden or duplicate product names must not target arbitrary fields.
- A stale list must not refill after purchase/reopen/reload.
- Another tab/frame must not execute the same list simultaneously.
- Invalid or foreign messages must not replace a valid stored list.
- A missing extension must not break calculator startup or editing.

### Task 1: Payload and extension transport

**Files:** index.html; extension-bridge.js; chrome-extension/{manifest.json,shared.js,background.js,calculator.js,popup.html,popup.js,popup.css}; tests/extension-transfer.test.cjs; package.json/package-lock.json.

**Interfaces:** CraftCore.npcShoppingList(totals) => [{id,name,quantity}]; YggShopping.validateItems(items); Chrome messages SAVE_LIST, CLAIM_LIST, REPORT_FILL, RESET_LIST, SET_ENABLED, CLEAR_LIST.

- [x] Write tests for missing-only NPC payloads, precision, validation and allowed sender origins; run and observe failures.
- [x] Implement explicit page transfer/ack, worker storage and claim ownership, popup controls.
- [x] Run tests; exercise invalid payloads, disabled state and list lifecycle; commit.

### Task 2: Shop recognition and filling

**Files:** chrome-extension/shop.js; chrome-extension/shared.js; tests/extension-shop.test.cjs; tests/fixtures/extension-shop.html.

**Interfaces:** YggShopping.findShop(document); YggShopping.fillShop(shop,items) => {filled,pending,errors}; worker ownership and progress from Task 1.

- [x] Write real DOM tests for exact names, accent differences, input/change events, duplicate/hidden rows, numeric limits and untouched unrelated items; observe failures.
- [x] Implement conservative shop detection/quantity setter and mutation-driven controller; only process remaining IDs and report completed entries.
- [x] Test reopen/reload progress and new sends, no automatic purchase; run full suite; commit.

### Task 3: Download and publication

**Files:** extension/index.html; downloads/ygg-alchemy-extension-1.0.0.zip; scripts/package-extension.py; README.md; site download link and purchase panel actions.

- [ ] Package deterministic ZIP with manifest at extracted extension directory root; inspect required paths and no test/dev dependencies.
- [ ] Document installation, explicit send, open shop, manual buy, pause/clear and update.
- [ ] Run full suite and diff checks; use a fresh reviewer; fix important findings.
- [ ] Publish preserving current remote changes, wait for Pages success, verify calculator startup, transfer fallback, download and instructions in browser.
