# Deployment guide

## Local development

1. Install Node.js 22.12+ from the official Node.js website. npm ships with Node.
2. Open a terminal in the project root.
3. Run `npm run setup` to install root, backend and frontend dependencies. For reproducible CI installs use `npm ci`, `npm ci --prefix backend`, and `npm ci --prefix frontend`.
4. Optionally copy `.env.example` to `backend/.env`. Defaults work locally without a database account or API keys. Do not commit `.env`.
5. Run `npm run dev`. The API uses port 5000; Vite uses port 5173 and proxies `/api` and `/ws`.
6. Wait for the API-ready message. First launch downloads MongoDB 7.0.24 (approximately 600 MB on Windows); allow time and network access. Later launches reuse the binary.
7. Visit `http://localhost:5173`. Login using the synthetic demo accounts below.
8. Stop with Ctrl+C. MongoDB data remains in `backend/.local/mongo-v1`. Keep this directory private and out of version control. Only one backend may use the local database at a time; it binds to 127.0.0.1:27019.

If port 5000, 5173 or 27019 is occupied, stop the other application or configure another API port and matching Vite proxy. If a local database startup was interrupted, first stop its owned backend process; do not delete data to repair it. You can instead use a real MongoDB replica set through `MONGODB_URI`.

## Single-server local preview

Run `npm run build`, followed by `npm start`. Visit `http://localhost:5000`. Express serves the built frontend and provides SPA route fallbacks. No Vite process is needed. Changes require rebuilding and restarting the backend.

## Environment variables

Names only; put real secret values in the hosting service's secret manager.

| Name           | Purpose                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| NODE_ENV       | Production/development controls                                                                                                       |
| PORT           | HTTP server port                                                                                                                      |
| CLIENT_URL     | Comma-separated exact frontend origins for CORS, CSRF origin checks and WebSocket Origin checks; include the deployed same-origin URL |
| TRUST_PROXY    | Optional comma-separated IP addresses or CIDR ranges of the reverse proxies that control forwarded headers                            |
| MONGODB_URI    | MongoDB Atlas or another transaction-capable replica set URI; required in production                                                  |
| JWT_SECRET     | Random secret of at least 32 characters; required in production                                                                       |
| LOCAL_DATABASE | Local development helper switch; production never starts the helper                                                                   |
| SEED_DEMO      | Enables synthetic accounts/menu/orders; production requires explicit opt-in                                                           |
| VITE_WS_URL    | Public Render WebSocket URL including `/ws`, read at Vercel build time                                                                |

For local development only, a random JWT secret is generated into ignored `backend/.local/jwt-secret`. It is not a fixed source-code secret. No external AI key is needed: the numerical model trains locally from labelled synthetic fixtures.

## Hosted reviewer demo

Use the [public GitHub repository](https://github.com/Anuj8506/dum-and-co) and its `main` branch for both services.

The [frontend](https://dum-and-co.vercel.app/) runs on Vercel Hobby. The [API](https://dum-and-co-api.onrender.com/api/health) runs on a free Render web service with a free MongoDB Atlas replica set in Singapore. The first request after Render idles can take about a minute.

1. Create a separate MongoDB Atlas replica set for synthetic demo records. Grant the application user access to the demo database and allow the Render service's outbound IP ranges. Store the connection string as a Render secret.
2. On Render, create a Node web service with root directory `backend`. Build with `npm ci --omit=dev`, start with `npm start`, and set the health check to `/api/health`. Render provides `PORT`.
3. Set `NODE_ENV=production`, `SEED_DEMO=true`, and the exact Vercel origin in `CLIENT_URL`. Generate a strong `JWT_SECRET` in Render and set `MONGODB_URI` there. Disabling `SEED_DEMO` blocks sign-in and session reuse for reserved demo accounts.
4. On Vercel, import the repository with root directory `frontend` and the Vite preset. Set `VITE_WS_URL` to the Render service's `wss://` URL ending in `/ws`. If the Render hostname changes, update the API rewrite in `frontend/vercel.json` and this variable.
5. Verify `/api/health` through both hosts, then test sign-in, simulated checkout and live kitchen updates. Use fictional information for the hosted demo.

Vercel proxies `/api` to Render so the browser receives the HttpOnly session cookie on the frontend's own origin. The browser obtains a short-lived ticket through that proxy and uses it to connect directly to the Render WebSocket. The ticket grants access to the same live updates as its associated session and sign-out revokes both.

Set `TRUST_PROXY` only when traffic arrives through proxies with known addresses that overwrite or correctly append forwarded IP headers. Direct connections ignore forwarded IP headers by default.

## Reviewer demo logins

| Role               | Email                    | Demo password  |
| ------------------ | ------------------------ | -------------- |
| Customer           | guest@dumco.example      | DumCoDemo2026! |
| Kondapur kitchen   | kitchen@dumco.example    | DumCoDemo2026! |
| Gachibowli kitchen | gachibowli@dumco.example | DumCoDemo2026! |
| Central manager    | admin@dumco.example      | DumCoDemo2026! |

These credentials intentionally expose only fictional demo records. They are not passwords for personal accounts.

## Reviewer walkthrough

1. Choose Kondapur, open Chicken dum biryani, add a portion and add-on.
2. Sign in as customer, open Bag, apply DUM10 and continue to payment.
3. Test a declined payment, then simulate successful UPI/card payment. Observe the tracking timeline and promised time.
4. In a separate browser profile, sign in as Kondapur kitchen. Find the same order and advance it through preparing, ready and handoff. The customer receives live updates; disconnected clients catch up on reconnect or at the 15-second polling fallback.
5. Override a preparation promise with a reason. A promise below the outlet minimum is raised automatically. The update appears in the customer timeline.
6. Pause a menu item. Confirm the customer cannot add it and an already-open unpaid checkout cannot pay for it.
7. Sign in as manager to edit menu items, portions, hours, city prices, and review analytics and party requests.
8. Check a seeded overdue order in the kitchen; the customer timeline records the ten-minute escalation when applicable.

## Checks

`npm test` runs integration tests against a separate disposable database. `npm run build` verifies frontend compilation. `npm run train --prefix backend` prints model coefficients, data provenance and validation statistics. Production needs capacity testing, real kitchen training data, backups, monitoring, real FSSAI information, messaging and payment provider integration before launch.
