# StudioSpace

> Book photo studios, film stages, podcast lounges, music suites and art workshops by the hour.

🔗 **Live Site:** https://studiospace-client-ochre.vercel.app/
🔗 **Server site:**https://studiospace-server-1g07honf4-tom-space.vercel.app/
🔗 **Server Repo:** https://github.com/Tonmoy225/Studiospace-server/tree/main
🔗 **Client Repo:** https://github.com/Tonmoy225/Studiospace--Client

StudioSpace is a peer-to-peer marketplace where creators discover and book studio spaces, and hosts list and manage their own studios.

## Features

- **Home page** with Swiper hero slider, 6 top-rated studios from MongoDB, category browsing, booking steps and host guarantee
- **Explore page** with live search, category filter, sorting, skeleton loaders and empty states
- **Authentication** with email/password and Google login (BetterAuth + MongoDB), password validation on register
- **Private routes** that survive a page reload (no redirect to login when already logged in)
- **Studio CRUD**: add, update and delete (with confirm modal), owner-only protection
- **Booking system** with status badges, cancel for pending bookings, and a host dashboard to confirm / complete
- **Wishlist** and **PDF invoice** download
- **Security**: JWT in an HTTPOnly cookie (protected API returns 401), double-booking prevention
- **Light / dark theme** toggle
- **Loading screen**: animated camera-lens logo whose iris rotates while data loads

## Tech Stack

Next.js (App Router), React, Tailwind CSS v4, DaisyUI, Swiper, React Hot Toast, React Icons, BetterAuth (MongoDB adapter), JWT, jsPDF, Express.js, MongoDB

## Run Locally

1. Clone the repo and install packages
   ```bash
   git clone https://github.com/Tonmoy225/YOUR-CLIENT-REPO.git
   cd YOUR-CLIENT-REPO
   npm install
   ```
2. Create a `.env.local` file in the project root:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   BETTER_AUTH_URL=http://localhost:3000
   JWT_SECRET=your_long_random_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   SERVER_URL=http://localhost:5000
   ```
3. Start the server repo first (`npm run dev`, port 5000)
4. Start the client
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

## Deploy (Vercel)

Add the same environment variables in the Vercel project settings, and set `BETTER_AUTH_URL` and `SERVER_URL` to your live client and server URLs.

## Examiner Test Credentials

- Email: examiner@studiospace.com
- Password: Examiner123

(Create this account on `/register` before submitting.)

## Author

**Tonmoy**, CSE student and junior web developer
GitHub: [Tonmoy225](https://github.com/Tonmoy225) · LinkedIn: [istier-tonmoy](https://linkedin.com/in/istier-tonmoy-587759394)