# Architecture

## Bounded modules
- users: student identity and timezone
- availability: available/unavailable time intervals
- sessions: proposals, participant responses and conflict checks
- calendar (Phase 3): Google Calendar adapter; external event IDs stored separately
- whatsapp (Phase 2): webhook verification, inbound message normalization and outbound notifications
- notifications: reminders and delivery preferences

## Important decisions
- The domain is multi-user. The first pilot has two users, but no hard-coded pair assumptions.
- UTC is the persistence format. The API requires timezone-aware ISO-8601 timestamps.
- WhatsApp is an interface, not the source of truth. The API/database own scheduling state.
- Google Calendar is a synchronized view, not the source of truth.
- Session acceptance is unanimous among invited participants.
- Authentication and authorization are mandatory before public deployment; the initial scaffold is local-development only.

## Next engineering tasks
1. Add auth (email magic link or OAuth) and ensure userId is never trusted from arbitrary request bodies.
2. Add DTO validation, pagination, API error format and integration tests.
3. Add availability-aware slot suggestions (intersection of AVAILABLE windows minus UNAVAILABLE windows and confirmed sessions).
4. Add idempotency keys for session creation and webhook processing.
5. Add WhatsApp webhook signature validation and command parser.
6. Add Google OAuth with least-privilege scopes and calendar ACL sharing.
