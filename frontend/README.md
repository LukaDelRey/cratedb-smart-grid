# Smart Grid frontend

Vue 3, TypeScript, Vite and Quasar provide the dashboard and digital twin pages.

```sh
npm install
npm run dev
npm run build
```

The API defaults to `http://localhost:8000`; set `VITE_API_URL` to use another
backend. See the [project README](../README.md) for the complete system setup.

Route pages live in `src/pages`. Shared navigation components live in
`src/components/layout`, and the shared topology dialog lives in
`src/components/system`. Other components are grouped by feature. Earlier unused
prototypes are preserved in `src/components/legacy`.

From the repository root, `npm run format` formats the source and sorts Vue
attributes; `npm run format:check` checks without writing. Install root
dependencies first. See [formatting and structure](../tools/README.md) for the
attribute order and Python formatting commands.

Styling conventions and component scope requirements are documented in
[src/styles/README.md](src/styles/README.md).
