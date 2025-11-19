# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

## Mock Email API (json-server)

This project includes a local mock API powered by `json-server` for email endpoints used by the email dashboard.

Files:

-   `src/services/mocks/db.json` — mock data (mailboxes + emails)
-   `src/services/mocks/routes.json` — route rewrite (`/mailboxes/:id/emails` -> `/emails?mailboxId=:id`)
-   `src/services/mailApi.ts` — small wrapper that calls `/api` endpoints (use Vite proxy in dev)

Run the mock server locally (PowerShell):

```powershell
npm run mock:server
```

This starts `json-server` on port `4000`. The Vite dev server is configured to proxy `/api` to `http://localhost:4000`, so the client can call endpoints like:

-   `GET /api/mailboxes`
-   `GET /api/mailboxes/inbox/emails?_page=1&_limit=20&q=term`
-   `GET /api/emails/e1`

Tips:

-   `--delay 400` in the script simulates network latency (400ms).
-   `json-server` returns `X-Total-Count` header when using `_page`/\_limit; `src/services/mailApi.ts` reads this header to compute total items.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
    globalIgnores(["dist"]),
    {
        files: ["**/*.{ts,tsx}"],
        extends: [
            // Other configs...

            // Remove tseslint.configs.recommended and replace with this
            ...tseslint.configs.recommendedTypeChecked,
            // Alternatively, use this for stricter rules
            ...tseslint.configs.strictTypeChecked,
            // Optionally, add this for stylistic rules
            ...tseslint.configs.stylisticTypeChecked,

            // Other configs...
        ],
        languageOptions: {
            parserOptions: {
                project: ["./tsconfig.node.json", "./tsconfig.app.json"],
                tsconfigRootDir: import.meta.dirname,
            },
            // other options...
        },
    },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default tseslint.config([
    globalIgnores(["dist"]),
    {
        files: ["**/*.{ts,tsx}"],
        extends: [
            // Other configs...
            // Enable lint rules for React
            reactX.configs["recommended-typescript"],
            // Enable lint rules for React DOM
            reactDom.configs.recommended,
        ],
        languageOptions: {
            parserOptions: {
                project: ["./tsconfig.node.json", "./tsconfig.app.json"],
                tsconfigRootDir: import.meta.dirname,
            },
            // other options...
        },
    },
]);
```

## Token Storage Strategy

### Why refresh token in localStorage?

We store the **refresh token** in `localStorage` for the following reasons:

1. **Persistence**: User remains logged in across browser sessions
2. **UX**: Seamless experience without frequent re-authentication
3. **Security Balance**: While localStorage has XSS risk, refresh tokens:
   - Can be revoked server-side
   - Have longer expiry (7 days vs 30min for access tokens)
   - Are rotated on each use (token rotation)

### Why access token in memory only?

The **access token** is stored ONLY in Redux state (in-memory):

1. **Security**: Not vulnerable to XSS theft via localStorage
2. **Short-lived**: Expires quickly (30 min), limiting attack window
3. **Auto-refresh**: Seamlessly refreshed using the refresh token
4. **No persistence needed**: User profile cached in localStorage provides instant UI

This hybrid approach balances security, UX, and modern best practices.
