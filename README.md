# StudyMate

A multi-user study coordination platform. Initial pilot: Afonso + Sebastiana.
The first release focuses on availability, conflict detection, study sessions and
mutual confirmation. WhatsApp and Google Calendar are integration adapters added
after the core workflow is stable.

## Stack
- NestJS + TypeScript
- PostgreSQL + Prisma
- WhatsApp Cloud API (Phase 2)
- Google Calendar API (Phase 3)

## Requirements
- Node.js 22+
- Docker + Docker Compose
- npm

## Quick start
1. Copy `.env.example` to `.env` and set `JWT_SECRET` (the file shows how to generate one).
2. Install dependencies: `npm install`
3. Generate Prisma client: `npx prisma generate`
4. Start everything: `npm run dev`

`npm run dev` starts PostgreSQL in Docker, applies pending migrations and runs the API
in watch mode on `http://localhost:3000/api`. Docker Desktop must be running.
After changing `prisma/schema.prisma`, create a migration with `npm run prisma:migrate`.

## Checks
- `npm test` — unit tests (session rules, login links and input validation)
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript without emitting

This is a foundation, not a deployed service. No Meta or Google credentials
are included. Never commit `.env`.

## Authentication
Login is passwordless, by magic link:

1. `POST /auth/request-link` with `{ "email": "..." }`. The answer is always the same,
   whether or not the email is registered.
2. The user receives a link valid for 15 minutes that works once. Without `SMTP_URL`
   (local development) the link is printed in the API console instead of being emailed;
   with `DEV_SHOW_LOGIN_LINK="true"` it also comes back in the response as `devLoginLink`.
3. Opening the link (`GET /auth/verify?token=...`, or `POST /auth/verify` with
   `{ "token": "..." }`) returns an access token valid for 7 days.
4. Send it on every other request: `Authorization: Bearer <accessToken>`.

Only a hash of each link token is stored, and at most 3 links per user are issued
every 15 minutes. The API never takes the acting user from the request body: it is
always the owner of the access token.

## API
All routes are under the `/api` prefix (e.g. `GET /api/health`). Routes marked
*public* need no login; all others need the `Authorization` header.

- `GET /health` — *public*
- `POST /users` — *public*; sign up with `name` and `email` (optional `phone`, `timezone`)
- `POST /auth/request-link`, `POST /auth/verify`, `GET /auth/verify` — *public*
- `GET /auth/me` — the logged-in user's own account
- `GET /users` — directory of students (id, name and timezone only)
- `POST /availability` — add a time window for yourself
- `GET /availability` — your windows; `?userId=...` shows a colleague's
- `POST /sessions` — propose a session to `participantIds`; you are the creator
- `GET /sessions` — sessions you take part in
- `POST /sessions/:id/respond` — accept or reject a proposal you were invited to

Errors: `400` invalid input, `401` not logged in, `403` not invited, `404` not found,
`409` scheduling conflict or duplicate email/phone. Unknown body fields are rejected.

A session becomes `CONFIRMED` only after all invited participants accept.
Timezone-safe recurrence, Google Calendar sync and WhatsApp webhooks are later milestones.

## Product rules
1. Availability windows are stored as UTC timestamps; clients send ISO-8601 values
   with an explicit offset.
2. A session proposal must not overlap the participants' existing confirmed sessions,
   nor any window a participant marked `UNAVAILABLE`. Sessions must start in the future.
   Conflicts are re-checked for every participant at the moment of confirmation, and
   concurrent requests are serialised per user so nobody can be double-booked.
3. Every participant must accept before confirmation.
4. Rejection by any participant changes the proposal to `REJECTED`.
5. The data model supports more than two students, but the first pilot is private.

## Roadmap
- M0: local backend + database + API smoke tests
- M1: authentication, permissions, input validation and automated tests (done; sign-up is still open to anyone)
- M2: WhatsApp Cloud API onboarding, webhook verification and command parser
- M3: Google Calendar OAuth, secondary calendar creation and sharing
- M4: reminders, recurring availability, course progress and deployment

## Meta setup checklist (later)
- Create Meta developer account and business portfolio
- Create a Meta app and add WhatsApp product
- Configure a WhatsApp Business Account and phone number
- Configure webhook URL + verify token
- Subscribe to `messages` webhook field
- Store access token, app secret and verify token in secret manager / `.env`
