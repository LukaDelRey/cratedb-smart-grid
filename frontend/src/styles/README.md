Component and page styling prefers Quasar utilities, including the nearest
spacing step and typography weight when the old value is between Quasar steps.
Use `q-pa-*`, `q-px-*`, `q-py-*`, `q-m*-*`, `text-weight-*`, `text-caption`,
`text-body2`, and flex gutters rather than exact pixel spacing. Unique geometry is inline; recurring
custom values use the `scada-*` utility classes in `global.css`. CSS grid gaps
remain shared utilities: Quasar gutters add child margins, which overflow fixed
grid tracks. Flex gutters use an explicit parent margin reset where the parent
must stay within its existing frame. Check fixed-height cards when spacing grows.

Quasar `overflow-hidden`, `overflow-auto`, `full-width` and `full-height` use
`!important`. Keep contextual and responsive overrides in shared CSS when these
utilities would defeat them. `full-width` also resets horizontal margins, so do
not combine it with automatic margins on centered containers. Preserve inline
units when a later selector overrides an earlier shared `display: block` rule.

Responsive rules, pseudo-elements, interaction states, SVG effects and component
overrides remain ordinary shared CSS. Dashboard component classes are in
`component-styles.css`, imported before Quasar. Page classes follow the original
theme in `global.css`. This order matters: Quasar's generated internal classes
can override a component class, and converting that rule into an inline style
would change the appearance.

Formerly scoped selectors use stable `data-v-ui-*` identifiers declared in
`component-scopes.json` and each component's `defineOptions`. The small template
transform in `vite.config.ts` preserves those attributes on static hoisted HTML,
while Vue handles component roots, slots and teleports at runtime. Do not remove
the scope declaration or registry entry without updating the corresponding CSS.

Substation page classes are contained by `.sst-layout` to avoid affecting other
pages now that the shared styles are available immediately.
