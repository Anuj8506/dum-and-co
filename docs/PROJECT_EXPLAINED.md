# Understanding the restaurant project

This guide explains the project in the same terms as the hostel allocation app. Start with the order journey; then follow the files in order. The stack is React, Vite, Tailwind, Node.js, Express, MongoDB/Mongoose and WebSocket, all aligned with the saved resume skills.

## The connection to your hostel project

| Hostel project         | Restaurant equivalent                     |
| ---------------------- | ----------------------------------------- |
| Student model          | Customer in User model                    |
| Room model             | Outlet and MenuItem models                |
| Preference submission  | Cart submitted as a checkout request      |
| Allocation controller  | Order controller                          |
| Gale-Shapley algorithm | Prep-time regression in algorithms        |
| Admin rooms page       | Admin menu page                           |
| Student results page   | Customer order tracking page              |
| JWT middleware         | HttpOnly JWT session plus role middleware |
| Axios services         | The same frontend/services pattern        |

The important difference: hostel allocation is a batch computation. A restaurant order is a changing workflow. New orders and status changes must reach the correct kitchen immediately.

## Follow one order

1. `frontend/src/pages/MenuPage.jsx` fetches menu data through `services/menuService.js`. The customer chooses an outlet, portion and add-ons.
2. `utils/AppContext.jsx` stores the bag in browser local storage. This is a convenience, not a source of truth for prices. Login tokens are never stored there.
3. `CheckoutPage.jsx` sends menu item IDs, quantities and selections to `POST /api/orders`.
4. `routes/order.routes.js` validates the request with Zod and checks that the signed-in user is a customer.
5. `controllers/order.controller.js` loads actual prices, availability and outlet settings from MongoDB. It rejects invalid selections and calculates integer-paise totals using `services/pricing.js`.
6. The controller passes queue load and item characteristics into `algorithms/prepTime.js`. The model returns a bounded prep estimate, source and confidence.
7. An awaiting-payment order is saved. An idempotency key prevents a retry from creating a second copy.
8. The demo payment endpoint rechecks stock and atomically redeems points, records payment and confirms the order in a database transaction.
9. `services/realtime.js` sends a small change event to the customer, the matching outlet staff and central manager. It never broadcasts every order to every browser.
10. The kitchen fetches the updated record through its protected API and displays a ticket.
11. Staff move the ticket from confirmed to preparing to ready to handed off. The backend rejects skipped or reversed transitions. Customer tracking refreshes on the same events.
12. Handoff credits reward points exactly once. Cancellation returns reserved points. Real payment capture/refund is outside this simulated build.

## Why routes, controllers and services are separate

A route says which URL and HTTP method are accepted. Middleware establishes who is asking and validates the request. The controller coordinates the database work. Services contain reusable pricing, notifications and seed logic. Models define stored records. Keeping these jobs separate makes a bug easier to locate and mirrors your previous project's layout.

## The AI in plain language

This is supervised numerical prediction, not a chatbot. A tiny ridge-regression model learns coefficients from 384 synthetic examples. A separate 96-example validation set measures whether training worked. Inputs describe the current kitchen: longest prep item, queued portions per cooking station, ordered portions, and whether it is dinner peak.

The seed generator and its assumptions are deliberately visible. The measured validation error is about 1.74 minutes on synthetic data only. It does not prove a real restaurant would achieve that accuracy. Production needs real completed-order history, a time-separated validation set and per-outlet calibration.

The promise is at least the outlet minimum. Typical estimates add two validation-error units as a buffer. Inputs outside the fixture range use a conservative rule fallback and a low-confidence flag for staff. Staff can override with a reason. More than ten minutes beyond promise produces a customer-visible event and manager alert on the board.

## Real-time updates

HTTP handles durable reads and writes. WebSocket announces that records changed. The browser then asks the protected HTTP API for current data. That keeps authorization in one place and makes reconnect recovery simple. A heartbeat closes dead sockets. The frontend retries after three seconds and fetches again when reconnected. Order pages also poll every fifteen seconds so a proxy that blocks WebSocket does not freeze the workflow.

## Money and race conditions

Money is stored in paise so floating-point rounding cannot change a bill. A coupon is applied before points. GST is included, not added again: `GST = round(totalPaise * 5 / 105)`. The backend ignores prices sent from the browser.

A MongoDB transaction groups point redemption, payment confirmation and the order write. If one step fails, all roll back. A unique `(user, idempotencyKey)` index makes duplicate checkout requests converge on one order. Transaction retries and an already-paid guard make duplicate payment requests harmless.

## Security choices you should explain

- Passwords are bcrypt hashes. Public registration can only create customers.
- JWTs live in HttpOnly SameSite cookies; JavaScript cannot read them.
- Staff accounts come from the seed or private provisioning, not a public role dropdown.
- Customer queries include their user ID; kitchen queries include their assigned outlet.
- WebSocket connections require a valid cookie and permitted origin.
- Inputs have length, type and range limits. MongoDB queries are built from validated primitives.
- Credentials, database files, local JWT secrets, node_modules and build output are ignored by Git.
- Known reviewer passwords are only for fictional demo records. No personal profile data was copied into this app.

## A useful order for studying the code

Read `backend/src/app.js`, one route file, its controller, its models, then `pricing.js` and `prepTime.js`. Next read `frontend/src/App.jsx`, `services/api.js`, `utils/AppContext.jsx`, `MenuPage.jsx`, `CheckoutPage.jsx`, `KitchenPage.jsx` and `OrderTrackingPage.jsx`.

Run the app after each section and trace a network request in your browser. Reproduce a failed payment, a paused item, an invalid transition and an uncertain estimate. Those examples give you concrete interview explanations rather than memorised descriptions.

## Interview questions to practise

Why does a kitchen need WebSocket instead of only HTTP? What happens when the connection drops? How do you prevent a customer changing a price in browser tools? Why must payment and reward balance be atomic? How do two retries avoid duplicate orders? Why is the AI validation metric not a production claim? Why are messages and payments mocked? What would you change for 1,200 orders per hour and several backend instances?

For scale, explain that this version has one API process and in-process WebSocket fan-out. Multiple instances need an outbox and shared pub/sub such as Redis, plus a shared rate limiter, load testing and operational monitoring. Those are natural next steps given your LogPulse experience, rather than dependencies needed for this focused demonstration.
