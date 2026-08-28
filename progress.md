# Ai-Assistant — Progress Log

## 2026-08-29 — Session 1 (Phase 1 start)

- **Plan mode exited** after user approval; branch `phase-1-foundations` created from `main` (no commits yet).
- Wrote `task_plan.md`, `findings.md` (working memory per planning-with-files).
- Wrote `docs/superpowers/specs/2026-08-29-ai-assistant-design.md` + `docs/superpowers/plans/2026-08-29-ai-assistant.md`.
- Scaffolded `backend/`: `npm init -y` → `type=module` → installed all runtime + dev deps (0 vulnerabilities).
- Built structure: `config/{env,logger}.js`, `models/{Conversation,Message,Preset}.js` (`assistant*` collections, paginate plugin), `middleware/{notFound,errorHandler}.js`, `utils/{constants,httpStatus,AppError}.js`, `app.js`, `server.js`, `.gitignore`, `backend/.env.example`.
- **Validation passed:** `node --check` on all backend JS (0 fails); server booted → "MongoDB connected" + listening on 4000; `GET /` → `{"success":true,...}` health envelope. Killed cleanly.
- Awaiting user review of Phase 1 before commit.

## 2026-08-29 — Session 2 (Phase 1 amendments)

- User requested **infinite exponential-backoff Mongo retry**: added `MONGO_RETRY` (initial 1000ms, factor 2, max 30000ms, serverSelectionTimeoutMS 5000) to `utils/constants.js`; new `config/mongo.js` `connectWithRetry()`; `server.js` now boots via it.
- User added two **strict rules** recorded in `task_plan.md` Global Constraints + Decisions (#14, #15) and spec §10: **JSDoc everywhere** and **arrow functions only** (exceptions: class ctors, generators, Mongoose `this`-binding hooks). Backfilled JSDoc + converted all remaining `function` declarations to arrows across Phase 1 (.env/constants/httpStatus module headers; AppError class docs; notFound/errorHandler → arrows).
- Next: validate (syntax + boot + negative retry test), then present for review/commit.

## 2026-08-29 — Session 2 continued (validation)

- `node --check` on all backend JS: 0 fails.
- Boot smoke: `MongoDB connected` + listening on 4000 + `GET /` envelope OK.
- **Negative retry test:** `MONGO_URI=mongodb://127.0.0.1:59999/retry-test` → logged escalating backoff across 5 attempts: `Retrying in 1000ms → 2000ms → 4000ms → 8000ms → 16000ms`. Confirms infinite exponential-backoff works. Killed cleanly; artifacts removed.

## 2026-08-29 — Protocol amendment (user request)

- User: the phase protocol was missing a step. **DEEP ANALYSIS added as mandatory Step 0 of every phase:** read the *entire* codebase without skipping a single thing; build super deep understanding of each file's responsibility and module relationships; verify consistency against spec + plan; log any drift/surprises in `progress.md` BEFORE writing any code.
- Recorded in: `task_plan.md` (Protocol bullet + Deep-analysis checkbox at top of Phases 2–5), spec §11 (Version Control Protocol), plan doc header + Step 0 in Phases 2–5.
- Phase 1 now ready to commit: `feat: phase 1 foundations — backend scaffold, Mongo retry + JSDoc/arrow conventions`.

## 2026-08-29 — Phase 2: Deep Analysis (Step 0)

Read the **entire** codebase, no skipping — all 26 tracked files (plan, spec, task_plan, findings, progress, .gitignore, package.json/.env.example/logs, and all 13 backend src files). Findings for Phase 2:

- **Backend shape (from Phase 1):** clean ESM, JSDoc + arrow-only everywhere, frozen `constants.js` + `env.js`, Winston logger, `express-async-handler` in stack, `AppError(message,status)` → `errorHandler` (hides 5xx internals), `notFound` 404 envelope, envelope + pagination shapes mandated by spec §7.
- **Models already ready:** all three models apply `mongoose-paginate-v2` → `Model.paginate(query,{page,limit,sort})` returns `{docs,page,limit,totalDocs,totalPages,…}` (strip extras). `Conversation`/`Preset`/`Message` fields + enums match spec §6.
- **app.js today:** only cors/json/morgan(dev)/health + notFound/errorHandler — no routes mounted. Phase 2 inserts `/api/conversations` + `/api/presets` mounts before `notFound`.
- **Validation:** `express-validator@7` in deps. New `middleware/validate.js` reads `validationResult(req)`, returns 400 envelope with the first plain message, else continues. Routes build chains (`body/param/query`), `.trim()`, `.toInt()` for page/limit, `.optional({values:'falsy'})` for nullable optional body fields; `isMongoId` for `:id`.
- **Decisions made during analysis:** list sort = `{updatedAt:-1}` for conversations/presets, `{createdAt:1}` for messages (chat order; adapter pages older on scroll-to-top). `DELETE /api/conversations/:id` cascades via `Message.deleteMany({conversationId})`. `DELETE /api/presets/:id` unsets `presetId` on conversations referencing it (keeps conversations valid). Pagination clamped: page ≥1, limit 1..100 (MAX_LIMIT). PATCH accepts a partial subset with `.optional()` (rejects empty title on update).
- **Drift/surprises (none blocking):** (1) `findings.md`/plan doc said branch `main`; local default was actually `master` — created `main` during Phase 1 merge (resolved). (2) spec pins `mongoose@^9.9.3`, package-lock resolved `^9.9.4` — caret-consistent, no action. (3) `app.js` health handler hardcodes version `0.1.0` (matches package.json — fine). (4) No `reasoningEffort`/`language` validation rejection for unknown enums — will add via `.isIn(constants.…)`.

Deep analysis complete → implementing Phase 2.

## 2026-08-29 — Phase 2: Implementation + validation

- Created: `middleware/validate.js` (400 envelope from `validationResult`), `utils/pagination.js` (validators + spec payload + resolvePage/Limit), `utils/pickFields.js` (strict-mode-safe body picking).
- Created controllers: `conversationController` (list/create/patch/delete + cascade), `messageController` (paginated, oldest-first), `presetController` (CRUD + unset presetId on conversations at delete). Named-export arrows, JSDoc everywhere, `express-async-handler`.
- Created routes: `conversationRoutes`, `messageRoutes` (`/api/conversations/:id/messages`), `presetRoutes` with express-validator chains (required trim/notEmpty/length; `isIn(REASONING_LEVELS|LANGUAGES)`; `isMongoId` params; page/limit ints, limit ≤ MAX_LIMIT). Mounted in `app.js` under `/api/*` before `notFound`. Removed `controllers/` + `routes/` `.gitkeep`.
- **Validation:** `node --check` clean; server booted (Mongo connected, listening 4000); **19/19 curl smoke checks passed** (create/400s/list newest-first/limit-clamp/patch/empty-title 400/messages empty+bad-id 404/messages, preset CRUD, preset-unset-on-delete, conversation cascade delete, /api 404 envelope). Smoke rows wiped from `assistant*` collections afterwards.
- Phase 2 implemented → STOP for user review before commit.

## 2026-08-29 — STRICT rule #3 (user request)

- **No unused imports/variables** — recorded as strict rule in `task_plan.md` Global Constraints + Decisions #16, spec §10, plan doc Global Constraints (+ the arrow/JSDoc summary line in the branch-protocol bullet).
- Audited the codebase: the only violation was an unused `import { constants }` in `conversationController.js` → removed (line 5). `errorHandler.js` keeps `next` by design (Express 4-arity error-middleware requirement; the documented exception).
- Revalidated below.

## 2026-08-29 — Revalidation after STRICT rule #3

- `node --check` on all backend JS: 0 fails. Boot green; CRUD spot-check passed (create → 201, list → ≥1, delete → 200, ends at 0 docs). DB clean.

## 2026-08-29 — Strict audit of Phases 1+2 (user request)

- Read **every** file under `backend/*` top to bottom (22 source files + `package.json` + `.env.example`; inventory verified via `find` + `git status --ignored`). Per-file verdicts: all OK, spec-conformant, conventions met.
- Static scans: `node --check` 22/22 pass; no real `console.` usage; no legacy `function` declarations; unused-binding scan → 0 real hits (the one flag was the legitimate side-effect `import 'winston-daily-rotate-file'`).
- Non-blocking findings fixed: ① `app.js` health used magic `200` → now `httpStatus.OK`; ③ JSDoc typo `resoling` → `resolving`. Item ② (`package.json` `private` as string `"true"`) — **kept as-is**: `npm pkg set private=true` on npm 11.11.0 emits the string form, which npm treats identically; per the never-hand-write-package.json rule no manual edit. Phase-3 notes logged (env `??` for baseUrl edge; SIGINT during retry loop) — not defects.
- Revalidated after fixes: `node --check` clean; boot green; health + conversations-list spot-check passed.

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| Smoke `PATCH {presetId}` read-back returned 400 (no-fields guard works as designed) | Reused `PATCH {}` as a read | Fixed smoke step to verify via `GET /api/conversations` list — passed |
| NVIDIA `meta/llama-3.3-70b-instruct` → 410 Gone (EOL 2026-08-26) | kept model | account probe → catalog switched to `openai/gpt-oss-120b` (details in Phase 3 add-on section) |
| Gemini `gemini-2.5-flash` rejected (retired for new users) | kept model | switched to `gemini-3.6-flash` + `thinkingConfig.thinkingLevel` (details in Phase 3 add-on section) |
| `addisSttService` client ignores `ADDIS_AI_BASE_URL` (chat adapter honors it) | — | one-line fix pending user approval before commit (see strict-validation findings below) |

## 2026-08-29 — Phase 2 shipped + Phase 3: Deep Analysis (Step 0)

- **Phase 2 committed** `43e29f1` on `phase-2-data-apis`, merged to `main` (`fb5aea3`), pushed `origin/main`, branch deleted. `package.json` left as npm-canonical `"private": "true"` string (verified: npm 11.11.0's `pkg set` emits strings; functionally identical).
- **Branch `phase-3-ai` created** from `main`. **Deep analysis performed** — re-read the full tree (all backend src, models, env, app/server, docs) and confirmed Phase 3 requirements. Logged understanding + decisions:
- **Provider catalog:** frozen config `PROVIDERS` in `services/providerCatalog.js`: `addis` (SDK, no reasoning, model `addis-1-alef`), `gemini` (`gemini-2.5-flash`, REST `generateContent`, `thinkingConfig.thinkingBudget` by level), `nvidia` (`meta/llama-3.3-70b-instruct`), `groq` (`qwen/qwen3-32b`, `reasoning_format:"parsed"` + `reasoning_effort`; off→`hidden`+`none`), `openrouter` (`deepseek/deepseek-r1:free`, reasoning always-on, captured from `message.reasoning`/`reasoning_content`/`reasoning_details`).
- **Keys gate:** `env.providerKeys` (null when absent) — providers without a key are excluded from `GET /api/meta/models` and `getAdapter()` returns null (chat → 503 generic). Current `.env`: nvidia+gemini+addis keys present; groq/openrouter absent.
- **Addis SDK facts (official, read in `node_modules/addisai`):** `new AddisAI({apiKey})`; `chat.completions.create({language?, messages, temperature, max_tokens})` → `choices[0].message.content`, model selected server-side; chat `language` only `am|om` (pass only for those); `speech.transcribe({audio: Uploadable, language: SttLanguage})` → `{text}`; STT limit 25MB/120s; `Uploadable = Blob | ArrayBuffer | ArrayBufferView | FileInput` — accept multer `Buffer` directly; rich error classes (`RateLimitError`, `InsufficientCreditsError`, `AuthenticationError`, `APIError`).
- **Gemini reasoning via REST:** `includeThoughts` is unreliable/fragile on `generateContent` (go-genai issue #292 + cookbook 400) → rely on `thinkingBudget` only (`off:0, low:1024, medium:4096, high:16384`); surface thought parts only when the API happens to return `part.thought === true`, else reasoning `null`.
- **Message context:** `loadHistoryMessages(conversationId)` (`services/messageContextService.js`) — last N=50 ascending (`createdAt:1`), `role`+`content` only (Groq: never send prior reasoning back). New `constants.CHAT` block.
- **STT pipeline:** `middleware/upload.js` multer memory `.single('audio')`, `limits.fileSize = MAX_UPLOAD_BYTES` (25MB); `errorHandler` extended for `MulterError` → 413. `services/ffmpegSplitter.js` — `ffprobe` duration (reject <1s, >300s), normalize to mono 16k `pcm_s16le` WAV; if ≤60s one file else `-f segment -segment_time 60` muxer. `services/addisSttService.js` — sequential `speech.transcribe` per segment, join ` `, temp dir cleanup in `finally`. **Deviation:** spec's 1s overlap dropped — hard boundaries avoid duplicated words at joins; noted for review.
- **Conversation model validation:** conversation create/patch now validate `modelProviderId`+`modelId` against the full frozen catalog via `getModelInfo()` (400 unknown model), regardless of key presence.
- Errors: new `services/providers/providerErrors.js` maps axios/provider failures and addis API error classes → AppError (429/402 surfaced, 5xx genericized by errorHandler).

## 2026-08-29 — Phase 3: Implementation + validation

- Built catalog (`services/providerCatalog.js` — frozen defs, key-gated availability, key-independent `getModelInfo`, adapter map), three adapters (`addisProvider` via SDK, `geminiProvider` via REST, `openAiCompatProvider` factory for nvidia/groq/openrouter with `buildReasoningParams` injection and reasoning extraction from `reasoning`/`reasoning_content`/`reasoning_details`), `providerErrors` mapper.
- `messageContextService` (last 50 asc, role+content only), `chatController`+`chatRoutes` (conversation 404, catalog model check, adapter/503 key-gate, per-request `reasoningEffort` override, persists both turns via `Message.insertMany`).
- STT: `upload.js` (multer memory `.single('audio')` 25MB), `ffmpegSplitter` (ffprobe duration gates <1s/ >300s → 400; normalize mono 16k WAV; single file ≤60s else `-f segment`), `addisSttService` (sequential `speech.transcribe` per segment, join, temp cleanup in `finally`), `speechController`+`speechRoutes` (multipart `audio` + optional `language`), `errorHandler` MulterError → 413 (`httpStatus.PAYLOAD_TOO_LARGE` added).
- `metaController`+`metaRoutes` (`GET /api/meta/models` key-gated). `app.js` mounts meta/chat/speech. Conversation create/patch now validate provider/model against the catalog (400 unknown).
- **Model correction discovered during live validation:** `gemini-2.5-flash` is **retired for new users** (Google error). Switched catalog to `gemini-3.6-flash` and adapter to `thinkingConfig.thinkingLevel` (`off→minimal, low→low, medium→medium, high→high`). Probe: `gemini-3.6-flash` → 200; `gemini-2.5-pro` also retired.
- **Validation results (live):** boot green; `/api/meta/models` returns exactly the 3 keyed providers (addis/gemini/nvidia; groq+openrouter hidden — correct); gemini chat round-trip `content:"hello"` persisted + messages listed back; create-bad-model → 400; patch-bad-model → 400; chat unknown conv → 404; chat on keyless groq conv → 503; speech no file → 400; STT 2s tone → 200 `{text:""}`; STT 65s tone → 200 (split into 2 sequential segment calls, ~11s); temp dirs cleaned (0 left). Smoke rows wiped → `assistantConversations:0, assistantMessages:0`. Stray server killed; no `:4000` listener left.
## 2026-08-29 — Phase 3 add-on: system/persona props + real STT + cross-model comparison

- **Gitignore:** root `.gitignore` gained `uploads/` (user placed a real 2.9MB webm in `backend/uploads/audio/`; previously unignored → would have been staged on next `git add -A`).
- **Conversation fields `systemPrompt` (≤4000) + `persona` (≤2000):** added to model, create/PATCH validators, `CONVERSATION_FIELDS`; empty string → `null` normalized in controller; chat passes `conversation.systemPrompt`/`persona` through to the adapter. Verified round-trip: create persisted both; `PATCH {persona:""}` → `null`.
- **Adapter `generate` unified to `{ messages, model, language, system, persona, reasoningLevel }`** with each provider forwarding its full native surface (server defaults; no per-request passthrough):
  - addis → native `system` + `persona`, `language` (am|om only), `temperature 0.7`, `max_tokens 4096`.
  - gemini → `systemInstruction` (persona+system joined), `thinkingLevel`, `temperature 0.7`, `maxOutputTokens 8192`.
  - openai-compat → leading `{role:"system"}` (persona+system), `temperature 0.7`, `max_tokens 4096` + Groq reasoning params.
- **Real STT test:** `POST /api/speech/transcribe` with `backend/uploads/audio/audio-8c1b3670-….webm` (2.9MB, 187.7s, matroska/webm) + `language=am` → **200 in 33s**, joined Amharic transcript (~1.7k chars). Split path exercised: 3×60s + 7.7s segments → sequential segment calls. Temp dirs cleaned (0 left; verified). Transcription read + understood (facts in comparison below).
- **NVIDIA model drift (live):** `meta/llama-3.3-70b-instruct` is **end-of-life** (410 Gone since 2026-08-26). Catalog switched to `openai/gpt-oss-120b` after probing the account: llama-3.3/3.1-nemotron/chatqa/mistral → 404 "Function not found for account" (key provisioned per-account), while llama-3.2 vision (11B/90B), `openai/gpt-oss-{20b,120b}` → 200. Chose `openai/gpt-oss-120b`.
- **Cross-model comparison (same persona + system, chat content = transcript, `language:am`):** gemini-3.6-flash effort off/low/medium/high (4), openai/gpt-oss-120b, addis-1-alef.
  - **Structure:** all six produced the exact 8-section Amharic template.
  - **Fact accuracy:** gemini (all efforts) + addis accurate (date 04/11/18, branch መስቀል ፍላወር, name ቤዛ እያሌው, entry 2:10, exit 7:15, checklist work, kitchen amps 2/10, tempered-glass door + building-management action, vault recommendation). **OpenAI/GPT-OSS-120b hallucinated:** 10→"20" amps, 2→"5" working; exit misread 7:15→15:07; door cause garbled ("contract"); vault → "cash shortage" mistranslation; incoherent observation bullets — despite returning a 2598-char reasoning trace (extractor works; reasoning display surfaced, but accuracy suffered).
  - **Latency:** gemini off 6.4s / low 5.1s / medium 15.6s / high 20.8s; nvidia 25.4s; addis 5.9s (STT itself 33s for 187.7s audio).
  - **Reasoning:** gemini REST surfaced no thought parts (reasoning `null`) — as expected; gpt-oss reasoning captured via `message.reasoning`; addis none. Output differences across gemini efforts were only latency + minor Amharic polish; factual content identical.
  - **Verdict:** gemini 3.6 (any effort) and addis-1-alef are the reliable report generators; gpt-oss-120b is not recommended for Amharic report synthesis.
- Cleanup: DB wiped (`assistantConversations:0, assistantMessages:0`), no `:4000` listener, `uploads/` ignored. **Everything uncommitted on `phase-3-ai`** awaiting user review (no commit per instruction).

## 2026-08-29 — Strict full-tree validation: Phases 1–3 (user request, pre-commit)

- **Read every file under `backend/*` top to bottom** (24 source files + `.env.example` + `package.json`; inventory via `git status`/`glob`): `src/server.js`, `src/app.js`, `src/config/{env,logger,mongo}.js`, `src/middleware/{errorHandler,notFound,validate,upload}.js`, `src/models/{Conversation,Message,Preset}.js`, `src/controllers/{conversation,message,preset,chat,meta,speech}Controller.js`, `src/routes/{conversation,message,preset,chat,meta,speech}Routes.js`, `src/utils/{constants,httpStatus,AppError,pagination,pickFields}.js`, `src/services/{providerCatalog,messageContextService,ffmpegSplitter,addisSttService}.js`, `src/services/providers/{addisProvider,geminiProvider,openAiCompatProvider,providerErrors}.js`. Per-file verdicts: all conform (JSDoc everywhere, arrow-only, validator↔schema length alignment — `systemPrompt` 4000 / `persona` 2000 / `title` 200, envelope + pagination shapes, 5xx genericization with 429/402 preserved, keys never leave the server, ESM only).
- **Static scans:** `npm ls --depth=0` clean (no stray deps); `node --check` on all backend JS green; no real `console.` usage; no legacy `function` declarations; no `require(` (pure ESM); `backend/.env` untracked; `uploads/` gitignored; `STT.OVERLAP_SECONDS` defined but **unused** (dead after the overlap drop — only referenced in a JSDoc). Git inventory: 8 modified + 12 new backend files, all reviewed content.
- **Findings (severity-ranked):**
  1. **Minor defect (fix pending approval):** `addisSttService.js` builds `new AddisAI({ apiKey })` without the configured `baseURL` → a custom `ADDIS_AI_BASE_URL` is honored by the chat adapter but silently ignored by STT. Fix: pass `baseURL: env.addis.baseUrl`.
  2. Dead constant: `STT.OVERLAP_SECONDS: 1` → delete.
  3. Nit: `geminiProvider` `if (!candidate?.content?.parts)` lets an empty `[]` parts array through → stores `""` with 200 instead of 502 → guard with `parts?.length`.
  4. Nit: `errorHandler` classifies every `MulterError` as 413; non-size errors (e.g. wrong field name) should be 400.
  5. Known edge (no action): empty-string `ADDIS_AI_BASE_URL` bypasses the `??` fallback; `||` would harden it.
- **Confirmed deliberate behaviors:** partial provider-only PATCH → generic 400 (provider+model must change together); `body('content').trim()` means stored user content is trimmed; empty `systemPrompt`/`persona` normalized to `null`; trimmed presets/titles. Whisper-split choice: short recordings are still ffmpeg-normalized (SDK gets valid WAV regardless of source container).
- `task_plan.md` re-synced to match reality (providers/models list, Phase 3 status, Decisions/Errors tables, Next Step).
