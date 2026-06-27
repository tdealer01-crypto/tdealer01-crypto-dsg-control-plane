# Production roll-forward — 2026-05-20

Purpose: create a verified GitHub PR merge commit so the docs/checkpoint changes already on `main` are included in the Vercel production deployment.

Roll-forward content already present on `main` before this PR:

- `README.md` production announcement update
- `qa-logs/production-checkpoint-2026-05-20.md`

Validation required after merge:

- Vercel production deployment reaches `READY`
- Production alias points to the new deployment
- `GET /api/readiness` returns HTTP `200` and `ok: true`

Boundary:

- This file is operational evidence only.
- Runtime code is unchanged by this roll-forward note.
