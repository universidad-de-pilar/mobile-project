# UI refinement (existing "mostrador" identity)

## Objective
Refine the UI of every admin view and of the public digital menu while keeping the current identity (tokens, components, look, copy, and behavior).

## Problem / why
- Typography and spacing scales are inconsistent: literals are used outside the tokens.
- States are bare: there is a "—" glyph and a spinner inside a card.
- Some touch targets are under 44px.
- Destructive actions look like primary actions.
- Primary buttons get lost at the end of long scrolls or lists.

## Scope
- In scope: `mobile/src/components/ui/mostrador/*`, the admin screens, and the menu (`[storeSlug]/*`).
- Out of scope: `app/screen/[token].tsx` and `components/player/*` (the TV view). The only possible exception is removing the QR, and only if it is low effort.
- No new dependencies, fonts, or palettes. No copy changes (those are only flagged).

## Button placement rule (app-wide)
1. There is one primary action per screen.
   - Lists: the primary action sits at the top of the list.
   - Forms: the primary action sits in a sticky footer.
   - A primary action never goes at the end of a scroll.
2. The sticky footer has a `surface` background, a top border, and safe-area padding.
3. Destructive actions use the `danger` variant, come last, sit apart from the primary, and always go through an inline confirm.
4. Logout is placed in Ajustes, or in Comercios for root, at the end, as ghost/danger. It never sits directly under a primary.
5. Back is an icon in the top bar, not a button in the body.

## Tasks
- [x] T1 Design system: type scale tokens, `Spacing.section`, darker `muted`, `Button` with `size`/`danger`/`ghost` + focus ring + accessible disabled state, `StickyFooter`, touch targets (stepper, toggle, add, close), and the `TabBar` safe area.
- [x] T2 `FeedbackState` with Ionicons + skeleton + `Button size="sm"`; consistent radii in `Card`/`ListRow`.
- [x] T3 Public menu: cart bar, chips spacing, price/add collision, multiline note, Subtotal/Total spacing, safe-area padding in the footers.
- [ ] T4 Admin forms: sticky footer in product-editor/ajustes/equipo/comercios, separated logout, section headings, select with a chevron, login hierarchy.
- [ ] T5 Admin catalog and orders: compact filter row (search + toggles), order-card hierarchy, primary/danger actions.
- [ ] T6 Admin pantallas: creation buttons above the lists, back as an icon, danger styling, grouped icon-buttons.
- [ ] T7 (optional) Remove the always-visible QR from the TV view, if it is isolated.

## Acceptance criteria
- `tsc` and `eslint` are clean, and jest stays green.
- Visual review on the device by the user for each task.

## Checks
- `node node_modules/typescript/bin/tsc --noEmit`
- `node node_modules/eslint/bin/eslint.js <files>`
- `node node_modules/jest/bin/jest.js --watchAll=false`

## TDD
- Mode: on (global CLAUDE.md), only for behavior modules. This work is markup and styles, so no new tests are added. Runner: jest.

## Route
- Each task goes to one delegated writer (sonnet), because each touches 2+ non-trivial files (writer trigger).

## Delivery
- Strategy: `stacked-to-main` against `develop` (user's choice), with chained PRs.
  - PR 0: `fix/catalogo-vista-compacta`, the base of this branch.
  - Then one slice per task (T1+T2 design system, T3 menu, T4-T6 admin, T7 QR).
- When finished: squash-merge each PR into `develop`, in order, and push `origin/develop`.

## Progress
- T1 `c1cf2f2`, T2 `c18f414`.
- Branch: `feat/ui-refinamiento`, created from `fix/catalogo-vista-compacta`.
- Critique done (code only, nothing rendered).
