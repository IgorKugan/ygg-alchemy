# Autocraft implementation

User explicitly requested configurable skill key (default 1), native left-click on recipe/confirmation buttons, optional second confirmation, repeat until crafting window no longer opens. Keep manual shop filling and calculator APIs.

Architecture: Manifest V3 debugger input restricted in code to the active HTTPS jogo.yggidle.com.br tab and claimed game frame. Content script inspects crafting DOM, including open shadow roots; the worker sends only key and left mouse events. No game internals, packets or purchases. Required debugger permission cannot be optional according to Chrome docs; explain update permission and debug banner. Attach only on explicit Start; detach on Stop/Esc, tab switch/reload/close, errors and completion. Minimum Chrome118 keeps active debugger worker alive.

DOM references inspected: MrAntares/roBrowserLegacy MakeItemSelection, ItemSelection and MakeArrowSelection templates use .list .item/.name, .ok and btn_ok.bmp (legacy buttons or ui-button). ItemSelection requires a crafting title. Secondary same-root detail allowed only after an identified recipe step; unrelated popups are never accepted. YggIdle actual runtime still cannot be loaded in the test browser (WebGL2).

- [x] Core: validated settings/key mapping and cancellable bounded state machine. Tests first for missing dialog retries, same-window stalls, secondary steps, explicit name matching, cycles and cancellation.
- [x] DOM: scoped recipe selection/image confirmation, open shadow roots, visibility and pointer coordinates including same-origin frames. Tests first with real DOM fixtures reflecting referenced structure.
- [x] Worker: explicit start/claim/input/progress/stop lifecycle, origin/token/frame/tab restrictions, native release pairs and detach. Integrate existing worker routing without breaking shopping; test external Chrome API boundary.
- [x] UI/controller: Start/Stop/Esc, configurable key/recipe/delays/limit, visible status and no auto resume. Persist settings. Package version1.2.0 and update installation page/README.
- [ ] Full tests, fresh review, publication, Pages result, live download hash and screenshot. State real-game validation limit honestly.

Verification: `npm test`: 88 passing, zero failures. `node --check` on runtime scripts passes. Reproducible v1.2.0 ZIP contains 18 files, manifest at root, each byte identical to source. Actual in-game execution remains unverified.

Review caught a visibility-change-during-claim race. Regression reproduced failing; token now exists before claim and inactive claims explicitly stop.
