# Carried ingredients and two weight batches

User requested per-material bag quantities in weight calculation and separate exports for the first batch using those materials and subsequent batches with no ingredients. Retain the extension 1.1 payload/manual button.

- [x] Extend weight capacity to all declared carried ingredients, including unused extras. Preserve old bowl-only/base-weight saves. Add an explicit checkbox to distinguish the game's total weight from weight excluding declared materials. Reject totals below declared ingredient weight.
- [x] Compute starting, purchased and finished weight without double counting; retain all leftovers. Both endpoints must remain <=90%. Subsequent batch clears declared ingredients while keeping the derived weight of equipment/other items.
- [x] Render fields for recipe ingredients and retained extras. Persist bag quantities separately from Meu estoque. Use only bag quantities in active weight calculations.
- [x] Preview first/subsequent max batches and export two independently calculated purchase lists. First uses bag stock; subsequent uses no ingredient stock. Label each export clearly; do not change the current first-batch selection when exporting subsequent batches.
- [ ] Test arithmetic, limits, all recipes, persistence, UI edits and exported payloads; review, publish preserving remote changes, and verify live calculator.
