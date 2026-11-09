# Dum & Co.

A Hyderabadi restaurant ordering app and live outlet kitchen workspace built for ISOCODE Labs problem 4. The project deliberately follows [Anuj's hostel-seat-allocation structure](https://github.com/Anuj8506/hostel-seat-allocation): CommonJS Express controllers/routes/models on the backend and React pages/components/services on the frontend.

[Hosted demo](https://dum-and-co.vercel.app/) · [API health](https://dum-and-co-api.onrender.com/api/health) · [Reviewer walkthrough](deployment.md#reviewer-walkthrough)

## Run it

Requires Node.js 22.12 or newer and npm. From this folder:

```powershell
npm run setup
npm run dev
```

Open **http://localhost:5173**. On the first backend startup, the local database helper downloads MongoDB 7.0.24 from MongoDB's distribution servers (about 600 MB on Windows). Afterwards it reuses the binary and persists data in `backend/.local/mongo-v1`. No Docker or MongoDB account is required for development. Port 27019 must be free. The local replica set allows the same transactions used with MongoDB Atlas.

For a single-server preview:

```powershell
npm run build
npm start
```

Open **http://localhost:5000**. Stop a running dev backend before starting another backend.

## Demo accounts

The sign-in page offers customer, kitchen and manager demo buttons. These use synthetic seeded accounts, not real identities.

| Workspace          | Email                    | Password       |
| ------------------ | ------------------------ | -------------- |
| Customer           | guest@dumco.example      | DumCoDemo2026! |
| Kondapur kitchen   | kitchen@dumco.example    | DumCoDemo2026! |
| Gachibowli kitchen | gachibowli@dumco.example | DumCoDemo2026! |
| Central manager    | admin@dumco.example      | DumCoDemo2026! |

Known demo credentials must only be used with fictional data. Set `SEED_DEMO=false` for non-demo environments and provision staff privately.

## What works

- Outlet selection; optional user-initiated nearest-outlet location and delivery-radius checks.
- Menu search, categories, vegetarian filter, photos, portions, add-ons, allergens and spice levels.
- Registration with consent and optional marketing preference; password hashing and HttpOnly session cookies.
- Cart, validated server pricing, inclusive 5% GST, coupon DUM10 (10%, capped at INR 100).
- Pickup or simulated delivery, kitchen notes, demo UPI/card success and failure/retry.
- Persistent order tracking, event history, reconnection and periodic catch-up.
- Outlet-scoped live kitchen board, timers, prep stages and rider/pickup handoff.
- A trained prep-time regression model using current queue load, item prep time, portions and dinner peak.
- Conservative fallback for inputs outside the training range, outlet minimum time, staff override and late-order alerts after ten minutes beyond promise.
- Central menu CRUD, city price override, effective hours, hide/publish, portions and add-ons.
- Outlet stock pauses that immediately update customers; stock checked again before payment.
- Earn rewards after handoff, atomic redemption, refund of redeemed points on cancellation.
- History-based content recommendations; the customer explicitly selects any suggested item.
- Party enquiry with 48-hour notice and staff confirmation or decline.
- Basic orders, prep-time, cancellation and repeat-customer overview.

External payments, WhatsApp/SMS and rider systems are **simulated**, as the brief permits. No payment details are collected and no external messages are sent. Order events represent the mocked notification history; in-app status delivery is real. Photos are illustrative stock imagery, and FSSAI identifiers are visibly marked demo placeholders.

## Folder structure

```text
ISOCODE/
  backend/
    src/
      algorithms/       # prep-time model, training fixtures and training command
      config/           # environment, MongoDB, constants
      controllers/      # auth, menu, ordering, manager workflows
      middleware/       # authentication, roles, schema validation
      models/           # User, Outlet, MenuItem, Order, PartyRequest
      routes/           # HTTP endpoint declarations
      services/         # pricing, WebSocket, sample data, late-order check
      app.js            # middleware and routes
      server.js         # database, HTTP and WebSocket startup
    test/core.test.js
    package.json
  frontend/
    public/images/      # bundled photos, works without third-party image requests
    src/
      components/       # Navbar, Footer, cards, item modal, common states
      pages/            # menu, login, bag, tracking, kitchen, admin, party
      services/         # Axios API wrappers, like the hostel project
      utils/            # shared app state, live updates, formatting
      App.jsx
      main.jsx
      index.css
    vite.config.js
    package.json
  docs/
    REQUIREMENTS.md
    PROJECT_EXPLAINED.md
    TECHNICAL_DESIGN.md
    ASSETS.md
  deployment.md
  .env.example
  package.json          # convenience scripts for both folders
```

## Verify

```powershell
npm test
npm run build
npm run train --prefix backend
```

Tests run against a separate disposable MongoDB replica set, never the development database. They cover pricing, access control, input attacks, idempotency, payment retry, rewards, stock changes, transitions, AI bounds, late notifications and WebSocket delivery.

Read `docs/PROJECT_EXPLAINED.md` for a guided walkthrough and interview preparation. Read `docs/TECHNICAL_DESIGN.md` for architecture, model limitations and assumptions. `docs/REQUIREMENTS.md` maps the client brief to the implementation. `deployment.md` contains detailed local and production deployment instructions.

## Important limits

The model is genuinely fitted and evaluated, but its observations are synthetic. Its reported validation error measures the synthetic generator only; it does not establish real kitchen accuracy. Replace fixtures with consented production preparation history and evaluate before launch. The sample scale of three outlets does not constitute a load test of 1,200 orders/hour. A public repository URL, if desired, must be set in the technical document before submission. No repository has been published by this local build.
