# Huntera boss guide implementation plan

**Goal:** Publish the existing 18-boss PDF as a Portuguese quick-reference website on the user's GitHub Pages.

**Architecture:** A dependency-free static page at `huntera/` in `IgorKugan/ygg-alchemy`. All content stays inside that folder; the existing calculator is untouched. Boss portraits are extracted from the source PDF and embedded in the dataset.

**Source:** Huntera_Boss_Elemental_Weakness_Guide.pdf, Library ID libfile_a6edaacda40081918b0e5fe7f04fb6d7, read on 2026-10-30.

## Constraints
- Preserve all 18 bosses, uncertain modifiers, negative healing values, and the Tibia-versus-Huntera distinction.
- Support name search, recommended-element filtering, local favorites, detailed elemental modifiers, and direct boss links.
- Work without remote fonts, libraries, or image dependencies; support narrow mobile screens and keyboard controls.
- Publish through the existing GitHub Pages branch main/root by adding only new paths.

## Tasks
- [x] Test dataset integrity, unknown/healing semantics, combined search and filters, and malformed stored favorites.
- [x] Implement the dataset, static interface, and interactions.
- [x] Run Node tests, browser checks at desktop/mobile sizes, and inspect screenshots.
- [ ] Publish the verified files atomically using a base-tree-preserving commit and confirm the Pages deployment.

## Review focus
Unknown values must not become neutral damage. Negative values must read as healing. Search and favorites must compose. Broken or blocked browser storage must not break the page. Existing calculator files must keep their original blobs.

## Verification evidence
- Four Node tests pass, including the browser-discovered dropdown regression.
- Browser: search, eight fire recommendations, favorites persistence, empty-state reset and Oberon direct link verified.
- Desktop (1363px): no horizontal overflow or broken portraits. A 390px iframe verified the responsive layout and mobile search.
- Review: accessible grouping added to every elemental modifier.
