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
| `addisSttService` client ignores `ADDIS_AI_BASE_URL` (chat adapter honors it) | passed `baseURL` to STT client | fixed in `a017ecd` (see Phase 3 shipped section below) |

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

## 2026-08-29 — Phase 3 reviewed, fixes applied, shipped

- **Approved strict-validation fixes applied:** ① `addisSttService.js` STT client now passes `baseURL: env.addis.baseUrl` (parity with chat); ② removed dead `STT.OVERLAP_SECONDS` constant; ③ `geminiProvider` guards with `!candidate?.content?.parts?.length` (empty `[]` now 502 instead of storing `""`).
- **Revalidation:** `node --check` on all backend JS: 0 fails. Boot green: `MongoDB connected` + listening 4000; `GET /` health envelope; `GET /api/meta/models` returns exactly the 3 keyed providers (addis `addis-1-alef`, gemini `gemini-3.6-flash`, nvidia `openai/gpt-oss-120b`; groq/openrouter hidden — correct). Server killed; no `:4000` listener left.
- **Shipped:** committed `feat: phase 3 ai providers & stt …` (`a017ecd`), merged `--no-ff` into `main` (`ade9cfa`), pushed `origin/main` `fb5aea3..ade9cfa`, deleted `phase-3-ai` (local + remote). Working tree clean on `main`.
- Next: **Phase 4 — Chat UI** (branch `phase-4-chat-ui`, mandatory deep-analysis Step 0 first).

## 2026-08-29 — Phase 4: Deep Analysis (Step 0) + strict UI rules + full logic
- **Branch `phase-4-chat-ui`** created from a clean `main` (`2decbed`). Tree clean (nothing committed yet).
- **Deep analysis** — re-read the **entire** codebase this session: all 24 backend source files + `.env.example` + `package.json` (backend surface re-verified live: envelope, pagination `{docs,page,limit,totalDocs,totalPages}`, express-validator 400s, key-gated `GET /api/meta/models`, `POST /api/chat` JSON contract, STT pipeline), `findings.md`, `task_plan.md`, spec §6–§9, plan doc Phase 4. Confirmed the X-Chat/MUI v9 developer surface against live docs (`@mui/x-chat@9.0.0-alpha.17`, MUI v9).
- **Strict UI rules (user)** recorded → `findings.md`: ① sizing `size="small"` / icons `fontSize="small"` (no-prop components exempt); ② assistant Copy + Retry with tooltip; ③ user collapsible cards + inline RHF (`register`+`forwardRef`) edit with Edit→Update swap; ④ Gemini-idiom reference. task_plan Decision #27.
- **Backend additions locked (3):** `?sort=asc|desc` on messages; preset optional `persona` (≤2000); `POST /api/chat/regenerate` (truncate-below + regenerate in place; new `loadHistoryMessagesUpTo` variant). Decisions #24–#26, #28.
- **Unified Edit/Retry model (user-approved):** edit a user turn OR retry its reply → truncate that turn's reply + everything below, generate one fresh reply in place. Client: Retry = regenerate without `content`; Edit = regenerate with `content`. No message-PATCH endpoint.
- **Design decisions:** visual identity = **Verdant manuscript** (palette/type/signature in `findings.md`); default mode = system. Presets = apply-to-conversation orchestration. STT → composer via `replaceContent`. Abort leaves the assistant reply persisted server-side (Phase 5 cancel-endpoint candidate).
- Recorded at build start: rules + logic written verbatim into `findings.md`/`task_plan.md`/this file. Next: implement the 3 backend additions → re-validate backend (`node --check`, boot, `/api/meta/models`, chat + regenerate + transcribe smoke) → scaffold `client/`.

## 2026-08-29 — Phase 4: Client implemented (Step 1–2). Validation: build clean, lint clean, API contract E2E green
- **Built the entire client.** `client/` now contains: `vite.config.js` (port 3000, `/api` → 4000 proxy), theme (Verdant tokens + Inter/Noto Serif Ethiopic/IBM Plex Mono + system color scheme), Redux (meta/presets/speech), `adapters/chatAdapter.js`, hooks (`useVoiceRecorder`, `useConversationActions`), all reusable components (`MuiChatSurface`, `MuiChatConversationList`, `MuiChatComposer`, `MuiAssistantMessageCard`, `MuiUserMessageCard`, `MuiModelSelector`, `MuiReasoningSelector`, `MuiLanguagePill`, `MuiPresetDialog`, `MuiEmptyState`) and `ChatPage`. Template leftovers removed.
- **VERIFIED runtime contract against installed `@mui/x-chat-headless`:** runtime never auto-creates conversations (app owns creation); `useChat()` exposes `{messages, conversations, activeConversationId, isStreaming, hasMoreHistory, isLoadingHistory, error, setError, stopStreaming, reloadConversations, reloadMessages, regenerate, sendMessage, …}`; `regenerate(messageId)` routes through `adapter.regenerate({conversationId, messageId, message: anchorMessage, messages, signal})` (verified in `sendMessageActions.mjs`), removing the old run first; `MessageList.Root` auto-loads history on top-reach via `loadMoreHistory` (`useMessageListBehavior.mjs`).
- **Edit-flow contract:** stage text via `adapter.stageEditedText` → `useChat().regenerate(userMsgId)` → page reloads the conversation once the new reply's parts leave `streaming` (ref-guarded effect) so the rewritten user turn + reply re-sync from the backend.
- **One contract fix during E2E:** send endpoint is **`POST /api/chat`** (mounted `app.use('/api/chat', chatRoutes)` with `router.post('/')`), NOT `/api/chat/send`. Adapter updated. `POST /api/chat/regenerate` confirmed.
- **Validation:** `npm run lint` (oxlint) → 0 issues; `npm run build` → ✓ 4.1s (chunk-size warning only, `dist/` deleted after); live backend + `npm run dev` on 3000, verified THROUGH the Vite proxy: create conversation, two sends (`POST /api/chat`, gemini replies), regenerate retry (no content), regenerate with edit `content` (user message rewritten to new text, reply truncated-below → exactly 2 messages), messages `?sort=asc&page=1`, conversation PATCH (valid provider+model pair), presets CRUD, delete. All `success: true`. Servers killed, no listeners left.
- **Remaining for the user to eyeball (browser-level E2E):** visual pass, streaming reveal, mic/STT, dark/light, 360px mobile drawer — then review + commit + merge/push/delete branch.

## 2026-08-29 — Phase 4: in-progress state committed, case-driven workflow starts

- User directive: Phase 4 has too many open issues for one pass → **commit, push, but do NOT merge** on `phase-4-chat-ui`, then stabilize case-by-case.
- **Working agreement recorded** in the new planning file `cases.md` (Step 1–4 loop + 5 strict requirements: no overriding the existing plan; commit only on request; everything on `phase-4-chat-ui`; everything traceable in planning files; next phase only when Phase 4 is green).
- Committed the full current state (backend chat/regenerate/presets/messages additions, entire `client/`, planning docs) as `feat: phase 4 chat ui — …` and pushed `origin/phase-4-chat-ui` (no merge to `main`).
- Phase 4 remains **not green** pending the case loop; `task_plan.md` untouched.

## 2026-08-30 — Case 001: chat settings on landing (implemented)

- User reported 4 chat-page issues → recorded as Case 001 in `cases.md` (root cause, fix, decisions in `findings.md`).
- **Prefs slice:** new `client/src/redux/features/settingsSlice.js` (`{modelProviderId, modelId, reasoningEffort, language}`, nulls → resolve at creation), registered in `store.js`. Controls read active-conversation `metadata` when active else prefs, and write-through both (prefs + PATCH).
- **Per-model languages** (`client/src/utils/constants.js`): `MODEL_LANGUAGES` — addis-1-alef `en/am/om`; all other models `en/am` (`languagesForModel` helper + `LANGUAGE_LABELS` moved here).
- **New `MuiLanguageSelector.jsx`** (Select + compact icon-menu variants) replaces deleted `MuiLanguagePill.jsx` (which was read-only — the "language does nothing" root cause). `MuiReasoningSelector`/`MuiModelSelector` gained `compact` (icon+menu for xs) and `slim` (fit sm appbar) variants; model menu grouped by provider via shared option builder.
- **`useConversationActions`:** `createChat`/`applyPreset` now seed `reasoningEffort` + `language` from prefs (preset pins win for its fields) and resolve the model via new `resolveModelPair(preset, settings, defaults)`.
- **`ChatPage.jsx`:** settings row now renders **always** (desktop header row; mobile AppBar). Mobile: Menu + brand, right-aligned controls (icons on xs, slim selects on sm) + preset; **Add icon only when `conversations.length > 0`**; title/time dropped on mobile; delete stays in drawer rows. Reasoning control shown only when the selected model has `reasoning:true`; model switch resets unsupported language to `en`; STT uses prefs language before any conversation.
- **Verification:** `npm run lint` 0, `npm run build` ✓ 31.5s (dist removed). API-level e2e vs live backend: create addis/am/off ✓, PATCH language ✓, invalid `fr` → 400 ✓, gemini/am/high ✓, preset-apply seeds am/medium + presetId ✓, model-switch om→gemini resets language to en ✓. Cleanup wiped. Browser eyeball still pending (case 1 of 4 — the in-browser confirmation for reload/STT remains open too).
- Awaiting user review of Case 001 (Step 4); nothing committed (commit on request only).

## 2026-08-30 — Case 001 review R2: four browser items (fixes applied)

- User browser eyeball of R1 surfaced four items (recorded as Case 001 R2 in `cases.md`):
  desktop controls left-aligned with no active conversation; `om` unavailable for the default
  Addis model at landing; tooltip arrow at bottom; console warning about `:focus-visible`.
- Fixes in `ChatPage.jsx`: (1) `desktopControls` wrapped in a right-pushed flex box
  (`sx={{ ml:'auto', display:'flex', alignItems:'center', gap:1.25 }}`); (2) language options
  derived from the **resolved** model (`languagesForModel(modelInfo?.id ?? displayModelId)`)
  so `om` appears for the default addis-1-alef despite `settings.modelId` being null on
  landing; (3) `placement="top"` on the five chat-page Tooltips (Remove preset, Apply a
  preset ×2, Delete conversation, New chat).
- Item 4 root-caused to `@mui/utils/isFocusVisible.mjs` dev-only warn fired when the runtime
  Chromium rejects the `:focus-visible` selector (`element.matches(':focus-visible')` throws)
  — environment issue, no code fix; theme's v9.4 `focusVisible` CSS indicator is not enabled
  and thus not the trigger; production builds never log it.
- Verification: `npm run lint` 0, `npm run build` ✓. Browser R3 eyeball pending; nothing
  committed (commit on request only).

## 2026-08-30 — Case 002: preset dialog selects (fixed)

- Reported: in the preset dialog, choosing provider/model/reasoning never shows the picked
  value on the field, the model list doesn't narrow by provider, and reasoning always lists
  all levels regardless of model capability. Recorded as Case 002 in `cases.md`.
- Root cause: the three MUI text selects were bound with RHF `register` +
  `value={getValues('...')}` and the model filter read `getValues('modelProviderId')`.
  Verified in the installed `react-hook-form@7.86.0` that `getValues` is non-reactive (no
  store subscription, no re-render on value change), so displays and the provider-conditioned
  model list froze; reasoning had no model-capability gate.
- Fix (all in `MuiPresetDialog.jsx`): the three selects now use RHF **`Controller`**
  (documented strict-UI-rule #3 exception in `findings.md`); local `providerId` + pinned-model
  `useState` drive the model-option filter and the reasoning disable (+ clear) when the pinned
  model has `reasoning:false`; provider change auto-selects its first model; `handleSave`
  forces `reasoningEffort:null` for non-reasoning pinned models.
- Verification: lint 0, build ✓. Browser eyeball pending; nothing committed.

## 2026-08-30 — Case 003: conversation message layout + streaming indicator (applied)

- Reported (items 1–2): user requests must render right / assistant left, and while a request
  is in flight until the response arrives, show MUI X Chat's built-in streaming indicator.
  Recorded as Case 003 in `cases.md`.
- Alignment root cause: every `MessageRow` was `display:flex` with default
  `justifyContent:flex-start`, so both roles landed left; the cards' `alignSelf` only affects
  the cross (vertical) axis, so it never moved a bubble sideways.
- Streaming research (X Chat 9.0.0-alpha.17 source, driven via mui-mcp): with a custom
  `renderItem` on headless `MessageList.Root` there is NO trailing streaming row and no
  `features` flag — the flag + auto waiting row live only in the material `DefaultMessageItem`
  we don't use. Reusable primitives confirmed + exports verified: `useStreamingIndicatorVisibility('auto')`
  → `{waiting}` (headless) and `ChatStreamingIndicator` (dots) exported from
  `@mui/x-chat/ChatIndicators`; `ChatStreamingIndicatorRow` is internal-only (not exported);
  headless `renderItem` passes only `{id, index}`.
- Fix: `MessageRow` `justifyContent` by role (user → flex-end); `StreamingWaitingRow` below
  the list gated on `waiting` (assistant-styled bubble with the X Chat dots); built-in
  `<ChatStreamingIndicator message={message} />` replaces the `▍` caret in the assistant
  bubble; removed the misleading `alignSelf:'flex-end'` from the user card.
- Verification: `npm run lint` 0, `npm run build` ✓ (dist removed). Live dev servers
  :3000/:4000 untouched; browser eyeball pending. Nothing committed (commit on request only).
- **R2 refinements (same day, user-requested):** user bubble recolored to match the assistant
  (`background.paper` + `text.primary` + `divider` border instead of `primary.main`); scroll-to-bottom
  affordance enabled via `overlay={<ChatScrollToBottomAffordance />}` on `MessageList.Root` —
  `features={{scrollToBottom:true}}` is ChatBox-only and inert on our headless custom surface, so the
  overlay is the exact equivalent (that's what ChatBox mounts internally). lint 0, build ✓.
- **R3 (same day, edit-request refinements):** edit textarea fully expands (static 400px
  `maxHeight`, subtle-scroll via wheel, scrollbar visually hidden) and the action-bar pencil swaps to
  an **Update** check button (form linked via `id` + `form=` attribute); Update submits the inline form
  (inline check button removed), collapses the card to its 2-line clamp, then the existing
  `regenerate` flow removes everything below + streams the new reply. Strict user constraint: no
  typing lag — the textarea stays `register('text')` uncontrolled (no Controller/watch/controlled
  value added; only static CSS + button wiring). lint 0, build ✓ (dist removed); nothing committed.

## 2026-08-30 — Case 003 R4: "edit never engages with a real click" (fix applied)

- **Reported:** clicking the pencil expands the card but inline edit never engages (no textarea,
  no pencil→✓ swap, can't type); user asked to compare against what worked before. Recorded as
  Case 003 R4 in `cases.md`.
- **Investigation:** the pencil's `openEdit` handler is byte-identical to the last-known-good
  `482d01d` (full 3-file diff vs that commit obtained). Headless clean-Chrome repro (real CDP
  mouse events) reproduced the exact symptom: a real click fires `pointerdown`+`click` on the Edit
  button and expands a long card (line-clamp `2`→`none`) but edit mode never renders, while a
  programmatic `el.click()` opens edit on both short and long cards. Ruled out: affordance overlay,
  row recycling (stable `id` keys), roving focus (unused by custom rows), stale HMR (served module
  curl-verified current). Suspects from the diff: the R3 `type="submit" form={formId}` cross-element
  submit and the `autoFocus` on the now-auto-growing `maxHeight:400` textarea fighting the
  virtualized list on real clicks.
- **Fix (`MuiUserMessageCard.jsx` only):** Update (✓) button back to a plain
  `IconButton onClick={handleSubmit(onSubmitEdit)}` — dropped `type="submit" form={formId}` and the
  form `id`; textarea `autoFocus` removed, focus restored via `inputRef` +
  `requestAnimationFrame` effect keyed on `editing`; all R3 behaviors kept (400px cap, hidden
  scrollbar, pencil→✓ swap, collapse + regenerate on save). Text registers still uncontrolled.
- **Verification:** `npm run lint` 0, `npm run build` ✓, `dist/` removed, servers untouched. User
  directive: assistant does **no live testing** — user re-tests edit in the browser. Nothing
  committed (commit on request only).

## 2026-08-30 — Case 003 R5: edit width + truncate-below for Edit and Retry (applied)

- **Reported:** edit now engages, but (1) the card width is wrong while editing; (2) after
  Update, responses below the edited turn stay. User added: **Retry must behave identically** —
  last response, and responses below a retried reply (removed). Recorded as Case 003 R5.
- **Root cause:** (1) shrink-to-fit card — the multiline textarea's ~20ch intrinsic width
  collapses the bubble in edit mode while display text wraps to the 78%/96% cap. (2) The X-Chat
  runtime `regenerate` removes only the anchor's **assistant run** (`resolveRegenerateAnchor`:
  assistant messages until the next user message), so later user turns + replies survive; the
  runtime never patches the anchor's parts either, so edited text needed a reload; and that
  reload **raced** — `pendingReloadRef` was set after the final store flush, so the `[messages]`
  watcher missed its window and never fired. Retry reused the same runtime path with no reload at
  all.
- **Fix:** `MuiUserMessageCard.jsx` — `width: editing ? '100%' : undefined` on the card;
  `onSubmitEdit` bails when streaming, then mirrors truncate-below into the store before
  `regenerate` (`store.setMessages(ids.slice(0, anchorIndex+1))`, anchor parts swapped to the
  trimmed text). `MuiAssistantMessageCard.jsx` — new `onSaved` prop; `handleRetry` resolves the
  anchor (nearest preceding user message) and truncates below it the same way, then
  `actions.regenerate(anchorId).then(onSaved)` (must pass the anchor user id — the assistant id
  is gone after truncation and would resolve to null). `MuiChatSurface.jsx` — passes
  `onSaved={onEdited}` to the assistant card. `ChatPage.jsx` — removed the racy
  `pendingReloadRef` watcher (and the now-unused `useEffect` import/local vars);
  `handleEdited(conversationId)` reloads deterministically once regeneration completes:
  `reloadMessages(conversationId ?? chat.activeConversationId).then(() => reloadConversations())`.
- **Verification:** lint 0, build ✓, `dist/` removed. User re-tests: edit width, edit
  truncate-below, retry-last, retry-mid-thread in the browser. Nothing committed (commit on
  request only).
- **User review (R5):** ✓ Retry removes below responses (works); Edit truncate-below confirmed
  working too. Reopened as R6: (1) Update icon must disable when content is unchanged; (2) the
  regenerated reply "leaves a space" instead of replacing in place; (3) mouse wheel can't
  scroll the edit textarea (keyboard arrows only).

## 2026-08-30 — Case 003 R6: disable-unchanged Update, reply gap/space, edit-textarea wheel (applied)

- **Reported:** (1) Update must be disabled while the content is unchanged; (2) after Update the
  below-responses ARE gone and the reply streams, but it's "displayed leaving a space" instead
  of replacing the old responses in place; (3) while the edit card is expanded, only keyboard
  arrows scroll the long textarea — the mouse wheel doesn't.
- **Root cause:** (1) nothing tracked content-changed. (2) `onSubmitEdit` forced
  `setCollapsed(true)` on save → the long edited card re-rendered at its 2-line clamp+ellipsis
  while its virtualized row still held the tall textarea-expanded height, leaving a blank spacer
  between the edited message and the regenerated reply (`store.addMessage` appends the reply
  correctly at the anchor, so placement was never a message-ordering bug). (3) the textarea is
  the scroll container (keyboard proves it), but wheel events chain to the outer virtualized
  scroller — the hidden-scrollbar CSS offers no wheel route.
- **Fix:** `MuiUserMessageCard.jsx` — `dirty` state via RHF `register('text', { onChange })`
  (no `watch`), reset in `openEdit`; Update IconButton `disabled={!dirty}`; removed
  `setCollapsed(true)` from `onSubmitEdit` (card stays expanded, reply replaces in place);
  `handleEditWheel` bound via `slotProps.htmlInput` (scrolls the textarea while it has overflow,
  chains to the list only at boundaries); `onSaved` reload gated on the store actually gaining a
  new message (`messageIds.length > truncatedLength`). `MuiAssistantMessageCard.jsx` — same
  reload gate in `handleRetry`. Both cards: below-restore now unreachable on regenerate
  skip/error.
- **Verification:** lint 0, build ✓, `dist/` removed. User re-tests: disabled-until-changed
  Update, no gap after Update, mouse-wheel scroll on the expanded edit textarea. Nothing
  committed (commit on request only).

## 2026-08-30 — Case 004: folder reorg + MUI direct imports (applied)

- **Reported:** move `client/src/components/pages/ChatPage.jsx` → `client/src/pages/ChatPage.jsx`; move `client/src/components/reusable/*` → `client/src/components/chat/*` (keep `reusable/` empty); correct all imports; **STRICT rule — every MUI import in `client/*` must be direct** (`import Box from "@mui/material/Box"`) and must be recorded in the planning files.
- **Applied:** `git mv` (11 renames) → `pages/ChatPage.jsx` + `components/chat/*` (10 files); removed empty `components/pages/`; left `components/reusable/` empty (no `.gitkeep`). Fixed `main.jsx` + all ChatPage relative/JSDoc imports + `@module` headers (11 files). MUI direct-import sweep across 13 files.
- **Key finding:** `@mui/material` v9 exports map has NO `./styles/ThemeProvider` or `./styles/useTheme` subpaths — only `./styles`; so `ThemeProvider`/`useTheme`/`createTheme` import by name from `@mui/material/styles` (same shape as `@mui/x-chat/headless`: a feature subpath, not the root barrel). Everything else is per-symbol (`@mui/material/Box`, `@mui/material/useMediaQuery`, `@mui/material/CssBaseline`, `@mui/material/InitColorSchemeScript`, …).
- **Verified:** lint 0, build ✓ (pre-existing chunk-size warning), `dist/` removed, grep-assert clean (no `reusable/`, `components/pages`, or root `@mui/material` barrel in `client/src`). Rule recorded in `findings.md` #6 + `task_plan.md` conventions. Review pending; nothing committed (commit on request only).
