# Ai-Assistant Implementation Plan

> **For agentic workers:** Execute with superpowers:executing-plans (inline, per our version-control protocol: user review gate per phase before commit). Steps use checkbox (`- [ ]`) syntax. No automated test framework (banned in spec) — verification is `node --check`, curl smoke, `vite build`, and manual E2E.

**Goal:** Ship Ai-Assistant across five phase-gated increments — foundations, data APIs, AI/STT, chat UI, polish.

**Architecture:** DB-authoritative `POST /api/chat` on an Express 5 + Mongoose 9 ESM backend (port 4000); React 19 + Vite + MUI v9 + RTK Query client (port 3000) whose chat shell is `@mui/x-chat` (Community/MIT). Client adapters wrap non-streaming REST in a local `ReadableStream` for smooth rendering.

**Tech Stack:** Backend — express ^5.2.1, mongoose ^9.9.3, cors, dotenv, express-async-handler, express-validator, multer, addisai ^0.2.0, axios, winston + daily-rotate-file, mongoose-paginate-v2; dev morgan, nodemon. Client — @mui/material ^9.3.1, @mui/x-chat@9.0.0-alpha.17, @reduxjs/toolkit ^2.12.0, react ^19.2.8, react-router ^8.3.0, react-hook-form ^7.86.0, react-toastify, dayjs, @emotion/react + styled, @fontsource/inter + noto-serif-ethiopic; dev vite ^8.2.2, eslint, @types/react(-dom), globals, @vitejs/plugin-react.

**Spec:** `docs/superpowers/specs/2026-08-29-ai-assistant-design.md`

## Global Constraints

Copied verbatim from spec — every task inherits these:
- Banned permanently: TypeScript, Next.js/SSR, Tailwind, zod, automated test frameworks, streaming/WebSocket server deps, axios client-side, client-side AI SDKs/browser keys, MUI paid editions, helmet, rate-limit, jwt/bcrypt.
- Never read/use `C:/Users/girma/Desktop/beza/addis-ai-stt-api/addis_ai_chat.py` or `C:/Users/girma/Desktop/beza/glm52-test/`.
- Scaffold via `npm init -y`/`npm create vite`; never hand-write package.json; lockfiles commit with their phase; never commit `backend/.env`.
- DB-authoritative chat; `GET /api/meta/models` key-gated; collections `assistantConversations`, `assistantMessages`, `assistantPresets`; `_id` everywhere.
- STT Addis-only, ≤60s segments, ffmpeg split/merge via `child_process.execFile`, `FFMPEG_PATH`/`FFPROBE_PATH`.
- Composer: X-Chat store, forwardRef wrapper `focusInput()`/`replaceContent(text)`, no RHF. RHF forms: `register` always; `Controller` only when impractical; `watch`/`useWatch`/`useFormState` banned.
- No deprecated MUI props; frozen `config/env.js` + `utils/constants.js`; Winston only (no console.log backend); arrow functions; kebab-case modules; PascalCase one-export components; `Mui*` in `client/src/components/reusable/`; no barrel files; JSDoc; envelope `{success,message,data}`; pagination `{docs,page,limit,totalDocs,totalPages}`; plain error messages; keys only in `backend/.env` (+ `.env.example`).
- Branch protocol: `phase-N-description`; **start of every phase = Deep analysis: read the entire codebase without skipping, build super deep understanding, log drift/surprises in `progress.md` before coding**; then exec uncommitted → review → `feat: phase N …` → push → merge → delete. No amend after push. `node --check` backend; `vite build` 0 errors + `dist/` deleted.

---

## Phase 1 — Foundations

**Files:**
- Create (root): `task_plan.md`, `findings.md`, `progress.md` ✅ (done — pre-branch)
- Create: `docs/superpowers/specs/2026-08-29-ai-assistant-design.md` ✅ (done)
- Create: `docs/superpowers/plans/2026-08-29-ai-assistant.md` (this file)
- Create: `.gitignore`, `backend/.env.example`
- Create: `backend/package.json` (scaffolded), `backend/src/server.js`, `backend/src/app.js`
- Create: `backend/src/config/env.js`, `backend/src/config/logger.js`
- Create: `backend/src/models/Conversation.js`, `Message.js`, `Preset.js`
- Create: `backend/src/middleware/notFound.js`, `errorHandler.js`
- Create: `backend/src/utils/httpStatus.js`, `utils/constants.js`
- Create: `backend/` dirs: `src/{config,controllers,middleware,models,routes,services,utils}` (empty stubs where needed, placeholder `.gitkeep`)

**Validation:** `node --check` on every backend `.js`; `npm run dev` boots and logs Mongo connection + listening on 4000 (needs Mongo reachable + `.env`).

- [ ] **Step 1: Create branch** — `git checkout -b phase-1-foundations` (done)
- [ ] **Step 2: Working memory** — `task_plan.md`, `findings.md`, `progress.md` (done)
- [ ] **Step 3: Docs** — spec + this plan (done)
- [ ] **Step 4: Scaffold backend**
  ```bash
  mkdir backend
  cd backend
  npm init -y
  npm pkg set type=module
  npm pkg set scripts.dev="nodemon src/server.js"
  npm pkg set scripts.start="node src/server.js"
  npm install express@^5.2.1 mongoose@^9.9.3 cors dotenv express-async-handler express-validator multer addisai@^0.2.0 axios winston winston-daily-rotate-file mongoose-paginate-v2
  npm install -D morgan nodemon
  ```
- [ ] **Step 5: `.gitignore` (root)** — `node_modules/`, `.env`, `logs/`, `dist/`, `*.log`
- [ ] **Step 6: `.env.example`** — same keys as `.env`, empty placeholders, comments.
- [ ] **Step 7: `config/env.js`** — frozen export: NODE_ENV, PORT, CLIENT_ORIGIN, MONGO_URI, ADDIS_AI_BASE_URL, ADDIS_API_KEY, FFMPEG_PATH, FFPROBE_PATH, NVIDIA_API_KEY, GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY. Throws on missing required. (Presence-only checks later.)
- [ ] **Step 8: `config/logger.js`** — winston w/ console (dev) + daily-rotate-file `logs/`.
- [ ] **Step 9: models** — Conversation/Message/Preset schemas (`assistant*` collections) + `mongoose-paginate-v2` plugin on Message & Conversation & Preset.
- [ ] **Step 10: middleware + utils** — `notFound.js`, `errorHandler.js`, `httpStatus.js`, `constants.js` (frozen), `app.js` (express app: cors with CLIENT_ORIGIN, json, health route `GET /`, routes hookup stub, notFound + errorHandler).
- [ ] **Step 11: `server.js`** — connect mongoose to MONGO_URI, app.listen(PORT), graceful stop.
- [ ] **Step 12: Validate** — `node --check` all files; `npm run dev`; confirm "MongoDB connected" + listening; then stop.
- [x] **Step 13: STOP for user review** → then commit `feat: phase 1 foundations — backend scaffold`, push, merge, delete branch.

---

## Phase 2 — Data & APIs

- [ ] **Step 0: DEEP ANALYSIS** — read the entire codebase without skipping a single thing; build super deep understanding of every file/responsibility/relationship; verify against spec + plan; log drift/surprises in `progress.md` BEFORE writing code.

**Files:**
- Create: `backend/src/routes/conversationRoutes.js`, `messageRoutes.js`, `presetRoutes.js`
- Create: `backend/src/controllers/conversationController.js`, `messageController.js`, `presetController.js`
- Create: `backend/src/middleware/validate.js` (validator result helper)
- Modify: `backend/src/app.js` (mount routes under `/api`)

**Interfaces:**
- Pagination: refs `utils/constants.js` → `PAGINATION = { DEFAULT_PAGE:1, DEFAULT_LIMIT:20, MAX_LIMIT:100 }`.
- Controllers return envelope via `res.json({ success:true, message:…, data })`.
- Errors: thrown `AppError(message, status)` → handled by `errorHandler`.

- [ ] **Step 1:** `conversationController` — list (paginated), create, update, delete (soft delete flag if decided; default: hard delete + cascade messages via `deleteMany`).
- [ ] **Step 2:** `messageController` — list messages for conversationId (paginated, populated conversation ref check).
- [ ] **Step 3:** `presetController` — CRUD.
- [ ] **Step 4:** validators via `express-validator` — title/prompt required; conversationId ObjectId; model ids validated against catalog on conversation create/update.
- [ ] **Step 5:** mount routes; wire `validate.js` helper to return 400 envelope on validation failure.
- [ ] **Step 6: Validate** — `node --check`; boot; curl smoke: create conversation, post message, patch, delete, list paginated.
- [ ] **Step 7: STOP for review** → commit phase 2, push, merge, delete branch.

---

## Phase 3 — AI Providers + STT

- [ ] **Step 0: DEEP ANALYSIS** — read the entire codebase, no skipping; super deep understanding; verify against spec + plan; log drift/surprises in `progress.md`.

**Files:**
- Create: `backend/src/services/providers/providerCatalog.js`, `addisProvider.js`, `geminiProvider.js`, `openaiCompatProvider.js`
- Create: `backend/src/services/speech/addisSttService.js`, `speech/ffmpegSplitter.js`
- Create: `backend/src/controllers/chatController.js`, `speechController.js`, `metaController.js`
- Create: `backend/src/routes/chatRoutes.js`, `speechRoutes.js`, `metaRoutes.js`
- Create: `backend/src/services/messageContextService.js` (history loader)
- Modify: `backend/src/app.js` (mount new routes)

**Interfaces:**
- `ProviderAdapter` → `{ async generate({ messages, model, reasoningLevel }) → Promise<{ content, reasoning }>, providerId }`.
- `providerCatalog.js` exports `MODELS` (frozen), `getAvailableModels()` (key-gated), `getAdapter(providerId)`.
- Normalize input `messages` to `[{ role:'user'|'assistant', content }]`.
- Effort map: `REASONING_LEVELS = ['off','low','medium','high']` → per-provider config (gemini budget; groq effort/format; others ignored).
- `addisSttService.transcribe(audioBuffer, { language })` → `{ text, segments }` (handles the ≤60s split internally per design; ffmpeg paths from env).

- [ ] **Step 1:** `providerCatalog` + `getAvailableModels` key-gating (+ `metaController` → `GET /api/meta/models`).
- [ ] **Step 2:** `addisProvider`, `geminiProvider`, `openaiCompatProvider` (axios; nvidia/groq/openrouter), each normalizing `{ content, reasoning }`.
- [ ] **Step 3:** `messageContextService` — load history (last N messages) for a conversation; map to provider format.
- [ ] **Step 4:** `chatController` — `POST /api/chat`: validate body, resolve conversation, apply reasoning override, load history, call provider, persist user + assistant messages, return `{ conversationId, message }`.
- [ ] **Step 5:** STT — `ffmpegSplitter` (ffprobe duration/validate, ffmpeg ≤60s split), `addisSttService` (sequential transcribe + merge + finally cleanup), `speechController` (multer memory 25MB) → `POST /api/speech/transcribe`.
- [ ] **Step 6: Validate** — `node --check`; curl `/api/meta/models` (groq/openrouter absent); real `/api/chat` on gemini/addis; STT with a short sample and a >60s synthesized file.
- [ ] **Step 7: STOP for review** → commit phase 3, push, merge, delete branch.

---

## Phase 4 — Chat UI

- [ ] **Step 0: DEEP ANALYSIS** — read the entire codebase, no skipping; super deep understanding; verify against spec + plan; log drift/surprises in `progress.md`.

**Files:**
- Create: `client/` via `npm create vite@latest client -- --template react`; install deps (spec §3).
- Create: `client/src/app.jsx`, `client/src/main.jsx` (theme provider, router, redux), `client/src/redux/store.js`
- Create: `client/src/redux/features/{conversations,messages,presets,chat,speech,meta}Slice.js`
- Create: `client/src/redux/baseApi.js` (fetchBaseQuery `/api`, envelope unwrap)
- Create: `client/src/theme/index.js` (token-driven, provisional)
- Create: `client/src/components/reusable/` — `MuiChatSurface.jsx`, `MuiChatComposer.jsx` (forwardRef wrapper), `MuiModelSelector.jsx`, `MuiReasoningSelector.jsx`, `MuiLanguagePill.jsx`, `MuiPresetDialog.jsx` (RHF register), `MuiConversationList.jsx`, `MuiEmptyState.jsx`
- Create: `client/src/hooks/useVoiceRecorder.js`
- Create: `client/src/adapters/chatAdapter.js` (ReadableStream from `POST /api/chat`; listMessages for history)
- Modify: `client/src/App.css` → inline/emotion; delete `client/src/assets` defaults that conflict.

**Interfaces:**
- `chatAdapter.sendMessage({ message }) → ReadableStream<chunk>`; chunk types per X-Chat (`start`, `reasoning-*`, `text-*`, `finish`).
- `MuiChatComposer` exposes ref `{ focusInput(), replaceContent(text) }`.
- `useVoiceRecorder()` → `{ status, start, stop, clearRecording, audioBlob }`.

- [ ] **Step 1:** Scaffold client + install; remove cruft; set port 3000, proxy `/api` → 4000 (vite config).
- [ ] **Step 2:** theme tokens + redux store + `baseApi` + slices.
- [ ] **Step 3:** `ChatProvider` + X-Chat composition (layout/list/thread/header/slots/overlay empty state).
- [ ] **Step 4:** header actions (model + reasoning selectors, language pill); hoisted state + memoized adapter.
- [ ] **Step 5:** composer — `MuiChatComposer` forwardRef wrapper; mic button; STT wiring (record → upload → replaceContent + toasts).
- [ ] **Step 6:** presets dialog (RHF register), conversation create/rename/delete, retry + copy message actions.
- [ ] **Step 7: Validate** — `npm run build` 0 errors; delete `dist/`; manual E2E against backend.
- [ ] **Step 8: STOP for review** → commit phase 4, push, merge, delete branch.

---

## Phase 5 — Polish

- [ ] **Step 0: DEEP ANALYSIS** — read the entire codebase, no skipping; super deep understanding; verify against spec + plan; log drift/surprises in `progress.md`.

**Files:**
- Modify: theme (finalize when user picks identity + default mode), empty/loading/error states, responsive drawer, aria labels, X-Chat `localeText` (እያሰብኩ ነው…, ሰላም), error toasts copy.

- [ ] **Step 1:** responsive conversation-list drawer <600px with labelled back control.
- [ ] **Step 2:** states — overlay empty state, message skeletons, error bubbles + toasts for chat/STT failures.
- [ ] **Step 3:** a11y + locale texts + keyboard pass.
- [ ] **Step 4:** finalize theme (pending user identity/mode decisions) + final copy review.
- [ ] **Step 5: Validate** — full `npm run build` 0 + `dist/` delete; record→transcribe→submit E2E; cross-check against spec §3–§13.
- [ ] **Step 6:** commit phase 5, push, merge, delete branch; mark all phases complete in `task_plan.md`.

---

## Self-Review Checklist (plan vs spec)

- Spec §2 exclusions → Global Constraints ✅
- §3 deps + scaffolding → Phase 1 Step 4, Phase 4 Step 1 ✅
- §4 DB-authoritative chat → Phase 3 Step 4 → client adapter Phase 4 Step 3/5 ✅
- §5 catalog + reasoning + key gate → Phase 3 Steps 1–2 ✅
- §6 models → Phase 1 Step 9 ✅
- §7 API + envelope/pagination → Phase 1 utils, Phase 2 ✅
- §8 STT ≤60s split/merge → Phase 3 Steps 5–6 ✅
- §9 UI anatomy + composer rule + RHF `register` rule → Phase 4 Steps 3–6 ✅
- §10 conventions → baked into every file task ✅
- §11 protocol → per-phase Step "STOP for review → commit → push → merge → delete" ✅
- §13 open items (identity/mode) → Phase 5 Step 4 ✅