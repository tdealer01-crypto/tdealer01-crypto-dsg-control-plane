# DSG Awakening Agent Production Upgrade

This document records the implemented, evidence-backed subset of the Manus-style production upgrade. It does **not** claim that every external provider action is production-ready; actions without configured credentials, persistence, or explicit confirmation fail closed.

## AI Gateway multimodal modes

`lib/dsg/connectors/ai-gateway.ts` now prepares and executes governed requests for these modes:

- `text` and `json` through the existing provider endpoints.
- `image_analysis` with required media evidence (`https://` URL or Base64 plus MIME type).
- `image_generation` through mode-specific image generation endpoints/models where supported.
- `video_analysis` through Gemini multimodal content parts with required video media evidence.
- `speech` through OpenAI text-to-speech request shaping.
- `audio_transcription` through multimodal audio request shaping for providers that support it in this gateway.

Every request keeps the Awakening Decision Frame contract:

- `verify`: hashes goal, prompt, and media references/data before any network call.
- `samadhi`: locks the request to the declared user goal.
- `kilesa`: blocks secret-like prompts, unsafe media prompts, unsupported modes, and missing evidence.
- `parami`: records provider/mode history only from caller-supplied history.
- `truthBoundary`: returns review-only or blocked status until external output is independently verified.

## Governed tooling layer

`lib/dsg/tools/governed-tools.ts` implements a fail-closed tooling layer and `app/api/dsg/tools/route.ts` exposes it as a server endpoint.

Implemented execution today:

- `shell.exec`: allowlisted local commands only (`pwd`, `node`, `npm`, `npx`, `rg`, `cat`, `sed`, `git`) with denied destructive/network/system-control patterns.
- `file.read`, `file.write`, `file.append`, `file.edit`: sandbox-confined paths with sensitive path blocking and runtime evidence hashes.

Prepared/review-only governance today:

- `browser`, `search`, `schedule`, `plan`, `workflow`, `api`, `google_workspace`, and `persistent_compute` requests receive deterministic audit hashes, truth labels, and blocked/review reasons. External or persistent actions remain blocked unless a real adapter, confirmation flow, and persistence backend are added.

## Output contract

Responses include:

1. Target/goal lock.
2. Data status (`ready`, `review`, or `blocked`).
3. Prepared body or runtime output.
4. Limitations and unverified boundaries through `blockedReasons`, `audit.truth`, and `outputVerification`.

## Verification commands

- `npx vitest run tests/dsg/ai-gateway.test.ts tests/dsg/governed-tools.test.ts`
- `npm run dsg:typecheck`
