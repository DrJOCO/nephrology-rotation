# Student UI Style Guide

This app should feel like an editorial clinical workbook: calm, dense enough for rounds, and clear under pressure. Use shared primitives before adding local style objects.

## Primitives

- `ToolShell`: Use for calculator or decision-support pages. It owns page padding, back affordance, title, description, optional action, and an optional info slot.
- `GuideShell`: Use for guide/detail pages. It owns the header rhythm, optional metadata row, accordion sections, teaching lists, discussion lists, and footer slot.
- `InfoBar`: Use for short contextual guidance, warnings, next actions, teaching pearls, and guide callouts. Pick a semantic tone and keep the copy brief.
- `SectionTitle`: Use for section headers with optional eyebrow, description, and action.
- `Chip`: Use for topic tags, selected filters, and tool option toggles. Do not create one-off pill styles.
- `Button`: Use for primary, secondary, and ghost actions inside the student app.

## Tokens

Prefer editorial and semantic tokens:

- Text: `T.ink`, `T.ink2`, `T.muted`
- Surfaces: `T.bg`, `T.surface`, `T.surface2`, `T.line`
- Primary actions: `T.brand`, `T.brandBg`, `T.brandInk`
- Status: `T.success`, `T.warning`, `T.danger`, `T.info` plus their `Bg` and `Ink` partners

The legacy aliases `T.navy`, `T.deep`, `T.med`, `T.ice`, and `T.pale` are deprecated. Do not use them in new code.

## State Color Rules

- `brand`: primary actions, focus, and brand identity.
- `success`: completed or passing state, preferably with a checkmark.
- `warning`: pending, caution, or needs-attention state.
- `danger`: destructive action, error, or clinically alarming value.
- `info`: neutral metadata, counts, and non-alarming guidance.

Do not use state colors as decoration. A colored surface should communicate a state or useful category.

## Layout Rules

- Keep shell padding and header rhythm in shared primitives.
- Keep cards for repeated items, modals, and framed tools. Do not nest cards.
- Use 8px radius for new shared primitives unless a component has a specific established need.
- Avoid local duplicated `ToggleChip`, callout, accordion, and section-title styles.
- Use `InfoBar` for "what matters here" guidance instead of ad hoc tinted blocks.

## Editorial Voice

- Prefer direct clinical language over playful labels.
- Avoid emoji in new UI copy. Use icons when the affordance benefits from a visual cue.
- Keep labels short: "Recommended next action", "Teaching pearl", "Before rounds".
- Put longer explanation in body text, not headings.

## Migration Rule

When touching a student surface, replace nearby duplicated shell, chip, callout, and section title styles with shared primitives. Keep unrelated refactors out of the PR.
