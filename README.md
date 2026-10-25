# HCM Lite frontend

Next.js App Router frontend for the Saylani HCM Lite challenge. The UI is JavaScript + React + Tailwind CSS and uses live API responses. It does not include seeded records or browser-side business rules.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_BASE_URL` to the backend API base URL.
3. Start the frontend with `npm run dev`.

The local API URL defaults to `http://localhost:5050/api/v1`. Keep private keys, database URLs and JWT signing secrets in the backend environment only.

## Backend connection

The frontend is connected to the Next.js Route Handler API in `../../Backend`, which listens on port `5050`. The API contract in [`../API_CONTRACT.md`](../API_CONTRACT.md) describes the implemented routes. Start MongoDB and the backend first; use the one-time setup screen to create the company Admin. The backend selects the configured database from `DB_NAME`.

## Implemented screens

- First-run company/Admin setup and sign-in screens.
- Role-aware Admin, HR and Employee navigation and dashboard pages.
- API-backed forms, tables, leave, attendance, payroll, announcements, notifications, audit, analytics and AI assistant screens.
- Loading, empty and server-error states across data screens.

All access control and business decisions must be enforced by the backend for every request.
