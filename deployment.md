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
| VITE_API_URL   | Optional separately hosted API origin; read at frontend build time                                                                    |

For local development only, a random JWT secret is generated into ignored `backend/.local/jwt-secret`. It is not a fixed source-code secret. No external AI key is needed: the numerical model trains locally from labelled synthetic fixtures.

## Production deployment recipe

The app has been run locally. No public deployment URL or remote Git repository is claimed.

Recommended: deploy the built frontend and backend on the same HTTPS origin to preserve the HttpOnly SameSite=Lax session design. A Node host with WebSocket support, such as Render, Railway or an equivalent service, can serve this app. Use an India region where available for the client's data-residency planning. Hosting choice and operational compliance must be reviewed before real customer data is used.

1. Publish the source repository when approved, preserving local Git history.
2. Create a MongoDB Atlas replica-set database. Configure an application-specific database user, TLS and a restricted network policy; store its URI only in the host's secret manager.
3. Configure the variables listed above, including the precise deployed HTTPS origin in `CLIENT_URL`, `NODE_ENV=production`, a strong `JWT_SECRET`, and `MONGODB_URI`.
4. For a fictional reviewer demo, enable `SEED_DEMO` and use a separate database with synthetic data. Disabling it blocks sign-in and session reuse for the reserved `dumco.example` accounts, including accounts already in the database.
5. Build command: `npm ci && npm ci --prefix backend && npm ci --prefix frontend && npm run build`.
6. Start command: `npm start`. The host supplies `PORT` if necessary.
7. Health endpoint: `/api/health`. Enable WebSocket upgrades to `/ws` and set an idle timeout above 30 seconds.
8. Verify customer, staff and manager demo flows, reconnection, stock pauses and order isolation. Do not use real card data: payments remain explicitly simulated.
9. Add the real GitHub repository URL at the top of the TDD. Add the live URL if publicly deployed. Confirm repository visibility for the review period before uploading submission files.

Set `TRUST_PROXY` only when traffic arrives through proxies with known addresses that overwrite or correctly append forwarded IP headers. Direct connections ignore forwarded IP headers by default.

Separate Vercel/Render hosting can match the hostel project's providers, but cross-site cookie handling requires a reviewed SameSite=None + Secure configuration and CSRF defence. This build intentionally recommends a single origin instead of silently weakening cookies.

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
