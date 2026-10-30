# Manual shop filling

User requested replacing automatic filling with an explicit button because the shop opens in another category. Keep the existing DOM adapter, payload and manual purchase confirmation.

- [x] Replace automatic activation with a popup-only FILL_REQUEST command targeting the current tab. Worker issues a unique request token; only the matching tab/frame may claim/report it. Old stored automatic lists must remain idle.
- [x] Content scripts execute one attempt per fresh command; receiving a list, changing category, reopening or reloading never fills. A new click can fill the current category or repeat the same quantities.
- [x] Replace toggle/reset with Preencher loja and Concluir / limpar. Show pending/complete/error state. Use chrome.tabs.query only for the active tab ID; no added permission.
- [x] Update tests first: explicit trigger, no automatic paths, missed click before shop opens is consumed, multiple tabs, new click after category change, no purchases and token validation.
- [ ] Release 1.1.0, update instructions, ZIP and site. ZIP manifest is at archive root to avoid the extra folder encountered during installation. Verify full suite, review, publish and check live download.
