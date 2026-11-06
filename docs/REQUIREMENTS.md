# ISOCODE problem 4 requirements map

Source: the expanded restaurant brief read from the signed-in ISOCODE workspace. Deadline shown: 9 November 2026, 11:59 pm IST. Client scenario budget (INR 9 lakh) and eight-week delivery period are context, not the take-home timeline.

## Required core

| Requirement                | Implementation                                                                    | Verification                                         |
| -------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Menu and cart              | MenuPage, ItemModal, CheckoutPage; portions and add-ons                           | Browser order walkthrough; server pricing tests      |
| Test payment               | Explicit simulated UPI/card success, decline and retry                            | Integration tests and browser checkout               |
| Central menu admin         | AdminMenuPage; create/edit, portions, add-ons, pricing, visibility and hours      | Role checks; API validation; browser editor          |
| Outlet kitchen display     | KitchenPage board; paid orders, timers, stages, handoff                           | Workflow and outlet isolation tests                  |
| Customer and kitchen roles | User model, JWT cookie and role middleware                                        | Unauthorized/forbidden API tests                     |
| AI prep estimate           | Trained numerical regression, synthetic dataset and held-out evaluation           | Model tests; training command                        |
| Real-time order updates    | Authenticated scoped ws events with refetch and reconnect                         | Real WebSocket integration test; live browser states |
| Seeded sample data         | Three named outlets and original three sample order records plus fixtures         | Seed and API tests                                   |
| Database and backend       | Persistent MongoDB replica set, Express REST API                                  | Integration tests use real isolated MongoDB          |
| Frontend and phone layout  | Responsive React/Tailwind/custom CSS; mobile outlet selection                     | Desktop and phone checks                             |
| Failure states             | Declined payment retry, stock conflict, reconnect, empty search and error banners | Browser and API tests                                |

## Additional client scope

| Requirement                                    | State                                                                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Location and delivery radius                   | User-initiated location, nearest-outlet lookup, server radius check; manual pickup available                |
| Menu photos and prices by city                 | Bundled illustrative photos; city price override in admin                                                   |
| Coupons                                        | DUM10, ten percent capped at INR 100; assumptions labelled                                                  |
| Outlet availability and time-based menus       | Outlet pauses and hour ranges, including overnight schedules                                                |
| Kitchen prep stages and handoff                | Confirmed, preparing, ready, handed off; invalid jumps rejected                                             |
| Loyalty earning and redemption                 | Earn after handoff, redeem at checkout, atomic balances and cancellation return                             |
| Party orders                                   | At least 10 guests, 48-hour notice; staff confirms or declines                                              |
| Orders, prep, cancellations, repeat customers  | Basic aggregate dashboard and per-outlet recent-order view                                                  |
| Automatic outlet routing                       | Order outlet determines kitchen; delivery radius validated                                                  |
| WhatsApp or SMS                                | Mocked external channel; customer-visible persisted event timeline and live in-app updates; no actual sends |
| AI reorder suggestions                         | Content-based taste profile from paid order history; suggestions never auto-add items                       |
| Minimum AI promise, override and overdue alert | Enforced floor; reasoned staff override; ten-minute escalation                                              |
| FSSAI, allergens, dietary symbols              | Visible; licence IDs explicitly demo placeholders                                                           |
| Inclusive 5 percent GST                        | Server integer-paise calculation and labelled UI, as specified by brief                                     |
| Marketing consent                              | Optional, off-by-default opt-in at registration; no external marketing sends                                |
| Slow network suitability                       | Bundled compressed photos, lazy menu images, compact events, reconnect and polling                          |
| 1,200 orders per hour peak                     | Design context only; not load-tested or claimed as achieved                                                 |

## Submission material

Technical design is in `docs/TECHNICAL_DESIGN.md` with a rendered PDF companion. Setup, hosting recipe, environment variable names and reviewer accounts are in `deployment.md`. Preserve Git history. The public GitHub URL must be added at the top of the TDD after repository publication. No application submission or public publication has been performed by this local build.

The brief explicitly says remaining MUST HAVE beyond CORE BUILD is optional depth. This build implements most of that depth; production external integrations and sustained load validation remain documented limits.
