# Formatting

Install the root and frontend dependencies, then run from the repository root:

```sh
npm run format
npm run format:check
```

The formatter uses Prettier and orders Vue template attributes as follows:

It also separates comma-joined variable declarations and adds a blank line
between top-level declarations, function sections and multiline sibling template
elements. Inline text spacing, declaration evaluation order and comments are
preserved. These readability rules are included in both formatting commands.

1. `v-*` directives and `model-value` / `:model-value`.
2. Plain attributes, alphabetically.
3. `:*` bindings, alphabetically.
4. `@*` listeners, alphabetically.

Attributes within the first group are also alphabetical. Object spreads such as
`v-bind="props"`, listener spreads and dynamic argument names remain in place:
moving them can change which value wins. Attributes between those boundaries are
sorted normally. The commented legacy GridMap prototype has no active template.

For Python, install the development requirements and use Black:

```sh
python -m pip install -r requirements-dev.txt
python -m black backend/app locust-simulator shared
python -m black --check backend/app locust-simulator shared
```

On Windows, use `.venv/Scripts/python.exe` when the virtual environment is not
activated. Formatters skip dependencies, build output, generated station data,
local backups and reference documents.

# Source structure

- `frontend/src/pages`: route-level pages.
- `frontend/src/components/layout`: shared navigation, top bar and twin header.
- `frontend/src/components/system`: shared system topology dialog.
- `frontend/src/components/dashboard`: dashboard cards, maps and operations panels.
- `frontend/src/components/settings`, `scenarios`, `transformer-twin`: feature components.
- `frontend/src/components/legacy`: unused earlier prototypes, kept for reference.
- `frontend/src/composables`, `stores`, `services`, `utils`, `types`, `i18n`: shared application logic.
- `frontend/src/styles`: theme, component styles and the component scope registry.
- `backend/app`: API, database setup and backend services.
- `locust-simulator`: telemetry simulation.
- `shared`: shared station data generation.

When moving a scoped component, update its key in
`frontend/src/styles/component-scopes.json` and keep its `defineOptions` scope ID
unchanged. This preserves the appearance of its shared CSS rules.
