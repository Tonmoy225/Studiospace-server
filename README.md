# StudioSpace — Server

Express + MongoDB API for StudioSpace (studios + bookings).
JWT is read from an HTTPOnly cookie (`studio_token`); protected routes return `401` without it.

## Features
- Public: list/filter/search/sort studios, studio details
- Protected (JWT cookie): add / update / delete studio (owner only)
- Booking with double-booking prevention (overlap check against Confirmed bookings)
- Host dashboard APIs: booking requests, confirm / complete / reject
- Guest APIs: my bookings, cancel pending booking

## Run locally
1. `npm install`
2. copy `.env.example` to `.env` and fill values (`JWT_SECRET` must match the client)
3. `npm run seed` (optional sample data)
4. `npm run dev`
