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
1. Copy `.env.example` to `.env`.
2. Start PostgreSQL: `docker compose up -d db`
3. Install dependencies: `npm install`
4. Generate Prisma client: `npx prisma generate`
5. Apply migrations: `npx prisma migrate dev`
6. Start API: `npm run start:dev`

The API listens on `http://localhost:3000/api`.

## Checks
- `npm test` — unit tests (session rules and input validation)
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript without emitting

The starter is a foundation, not a deployed service. No Meta or Google credentials
are included. Never commit `.env`.

## Initial API
All routes are under the `/api` prefix (e.g. `GET /api/health`).

- `GET /health`
- `POST /users` — create a student
- `GET /users` — list students
- `POST /availability` — add a time window
- `GET /availability?userId=...` — list a student's windows
- `POST /sessions` — propose a study session
- `GET /sessions?userId=...` — list sessions involving a student
- `POST /sessions/:id/respond` — accept or reject a proposal

Errors: `400` invalid input, `403` user not invited, `404` not found, `409` scheduling
conflict or duplicate email/phone. Unknown body fields are rejected.

A session becomes `CONFIRMED` only after all invited participants accept.
The initial API is intentionally simple; authentication, timezone-safe recurrence,
Google Calendar sync and WhatsApp webhooks are later milestones.

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
- M1: authentication, permissions, input validation and automated tests
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
