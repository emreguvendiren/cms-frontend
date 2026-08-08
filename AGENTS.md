# Frontend Engineering Instructions

## Architecture

- Organize business code by feature.
- Keep application bootstrap code under `src/app`.
- Keep reusable technical primitives under `src/shared`.
- Do not import one feature's internal files from another feature.
- Export feature public APIs through the feature's `index.ts`.
- Pages should compose features and layouts.
- Pages must not contain reusable business logic.

## TypeScript rules

- TypeScript strict mode must remain enabled.
- Do not use `any`.
- Prefer `unknown` at untrusted boundaries and narrow it safely.
- Do not use type assertions to hide type errors.
- Prefer discriminated unions for state with multiple variants.
- Avoid duplicating API types manually.
- Use readonly data where mutation is not required.
- Validate runtime input even if compile-time types exist.

## Component rules

- Keep state as close as possible to the component that owns it.
- Do not lift state without a concrete sharing requirement.
- Prefer component composition over large configurable components.
- Avoid boolean prop explosions.
- Use explicit variants or discriminated unions when component modes differ.
- Do not define large components containing data access, transformation,
  business rules and presentation together.
- Extract custom hooks for reusable stateful behavior, not for every function.

## Render performance

- Do not add `memo`, `useMemo` or `useCallback` automatically.
- First reduce state scope and unnecessary parent updates.
- Do not store values in state when they can be derived during render.
- Avoid Effects that only synchronize derived state.
- Keep context values small and stable.
- Split contexts by responsibility and update frequency.
- Use stable list keys based on entity identity.
- Never use array indexes as keys for mutable lists.
- Memoize expensive calculations only when their cost or render impact
  is measurable or structurally clear.
- Profile meaningful render problems before introducing complex optimizations.

## Data fetching

- Keep remote server state outside global client stores.
- Centralize query keys.
- Configure stale time and cache behavior intentionally.
- Cancel or ignore stale requests when search parameters change.
- Debounce user input only when the interaction requires it.
- Preserve loading, empty, error and success states explicitly.

## Testing

- Test user-visible behavior.
- Prefer accessible queries over implementation selectors.
- Do not test internal hook calls or component implementation details.
- Add regression tests for fixed render loops and stale state bugs.

## Verification

Run:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test`
4. `pnpm build`

## UI and UX requirements

### Mandatory responsive design rule

Every user interface and every visual state must be responsive by design.
Responsive behavior is a release requirement, not an optional polish step.

- Design and verify every changed screen at 360px, 768px, 1280px and 1440px.
- The same primary task and critical actions must remain available at every width.
- Prevent horizontal page overflow, clipped text, overlapping controls and
  unreachable actions.
- Do not solve narrow layouts by scaling down the desktop interface.
- Reflow grids and forms, prioritize content, and provide intentional mobile
  alternatives for wide tables and dense desktop interactions.
- Touch targets must remain usable and keyboard focus must remain visible.
- Loading, empty, error, success, validation, permission and long-content states
  must also be checked responsively.
- Add a regression test when responsive behavior depends on conditional React
  rendering rather than CSS alone.
- Do not report UI work complete until the responsive review is performed and
  its tested widths are included in the completion report.

Use `$antd-product-design` whenever creating or modifying:

- Pages
- Forms
- Tables
- Dashboards
- Navigation
- Modals
- Drawers
- Feedback
- Responsive layouts
- Shared UI components
- Theme configuration

All interfaces must use Ant Design components unless a custom component
has a documented product requirement.

All colors, radii, typography, borders and shadows must come from the
centralized theme.

### Status tag standard

- Green success tags must use the same centralized brand-green background as
  primary actions, with white text and a matching brand-green border.
- Use Ant Design's semantic `success` tag variant so this appearance is applied
  centrally; do not recreate green tag colors inside feature-level CSS.
- Keep the status text visible because color alone must not communicate state.

Feature-level hardcoded color values are forbidden.

Do not generate generic AI-style interfaces containing gradients,
glassmorphism, decorative blobs, glowing cards, arbitrary KPI cards,
meaningless charts or excessive rounded containers.

Before implementation, identify the user's goal, primary action,
information hierarchy and all required UI states.

Do not report completion until `$antd-product-design` review and
`$code-change-verification` have been completed.
