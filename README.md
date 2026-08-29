# WishRoom

Shared, private wishlist rooms — paste a product link, group members see it, whoever buys it marks it bought so nobody double-gifts.

## What's inside

```
wishroom/
├── backend/    Spring Boot 3 (Java 21) — JWT auth, rooms, items, link-preview
└── frontend/   React + Vite + Tailwind v4 — deploy to Vercel
```

## V1 scope (by design)

- **Auth**: email + password, JWT.
- **Rooms**: invite-only, shareable 7-character code (e.g. `9F3K7QZ`).
- **Items**: paste any product link → backend fetches Open Graph tags (title, image) server-side via Jsoup → you confirm/enter the price yourself.
- **No live price/discount API is wired in yet.** Amazon's Product Advertising API requires an Associates account with real sales to even get access, and Flipkart has no open public API — only an Affiliate API that needs an approved affiliate account. Rather than block launch on that approval, V1 ships with manual price entry + link metadata, behind a `LinkMetadataService` you can swap out later (see "Adding a real price API" below).

## Running locally

### Backend
Requires Java 21 + Maven.

```bash
cd backend
mvn spring-boot:run
```

Runs on `http://localhost:8080` with an **in-memory H2 database** (`dev` profile, default) — zero setup, data resets on restart. Visit `http://localhost:8080/h2-console` to inspect it (JDBC URL: `jdbc:h2:mem:wishroom`, user `sa`, no password).

### Frontend
Requires Node 18+.

```bash
cd frontend
npm install
cp .env.example .env    # point VITE_API_BASE_URL at your backend
npm run dev
```

Runs on `http://localhost:5173`.

## Deploying

**Frontend → Vercel.** It's a static Vite build, deploys as-is. Set the environment variable `VITE_API_BASE_URL` in the Vercel project settings to your deployed backend URL. `vercel.json` already handles SPA routing (so refreshing `/rooms/xyz` doesn't 404).

**Backend → Render or Railway, NOT Vercel.** Vercel only runs serverless functions; a Spring Boot app needs a persistent JVM process, which Vercel doesn't support. Render and Railway both have free tiers that do.

On your host, set these environment variables and switch to the `prod` Spring profile:

```
SPRING_PROFILES_ACTIVE=prod
DATABASE_URL=jdbc:postgresql://<host>:5432/<db>
DATABASE_USERNAME=<user>
DATABASE_PASSWORD=<password>
JWT_SECRET=<a long random string, 32+ chars>
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

For the database itself, [Neon](https://neon.tech) or [Supabase](https://supabase.com) both give a free Postgres instance — grab the connection string from either and use it as `DATABASE_URL`.

## Adding a real price API later

`LinkMetadataService.java` is the one place that touches product data. To add live pricing:

1. Apply for the **Flipkart Affiliate Program** (free) → once approved, call their Affiliate API for Flipkart links instead of just scraping og-tags.
2. For Amazon, keep using manual price entry until you have enough Associates sales to qualify for their Product Advertising / Creators API — or use a paid aggregator (Canopy, QuickCommerceAPI, etc.) if you'd rather pay than wait.
3. Wrap whichever source(s) you add behind a small `PriceProvider` interface, keyed by `source` (the hostname `BucketItem.source` already stores) so each platform's logic stays isolated.

## Tech stack

- **Backend**: Spring Boot 3.3, Spring Security (stateless JWT), Spring Data JPA, Jsoup, H2 (dev) / PostgreSQL (prod)
- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router, Axios
