# Ai-Assistant — Task Plan

**Goal:** Build "Ai-Assistant," a single-user, multi-provider MERN chat assistant (English + Amharic/Ethiopic via Addis, Addis-only voice STT with 60s auto-split, prompt presets, conversation history). DB-authoritative chat, no auth.

**Architecture:** React 19 + Vite 8 + MUI v9 + Redux Toolkit (RTK Query `fetchBaseQuery`) client; Node.js + Express 5 + Mongoose 9 + ESM backend (port 4000). Chat UI shell is `@mui/x-chat` (Community/MIT). `POST /api/chat` is DB-authoritative: server loads history, calls provider, persists user+assistant messages, returns the assistant message; client adapter wraps it in a local `ReadableStream` for smooth X-Chat rendering.

**Tech Stack:** Backend: express ^5.2.1, mongoose ^9.9.3, cors, dotenv, express-async-handler, express-validator, multer, addisai ^0.2.0, axios, winston + daily-rotate-file, mongoose-paginate-v2; dev morgan + nodemon. Client: @mui/material ^9.3.1, @mui/x-chat@9.0.0-alpha.17, @reduxjs/toolkit ^2.12.0, react ^19.2.8, react-router ^8.3.0, react-hook-form ^7.86.0, react-toastify, dayjs, @emotion/react + styled, @fontsource/inter + noto-serif-ethiopic; dev vite ^8.2.2, eslint, @types/react(-dom), globals, @vitejs/plugin-react.

**Spec:** `docs/superpowers/specs/2026-08-29-ai-assistant-design.md`

---

## Global Constraints (frozen — every task inherits these)

- **Permanent exclusions (reversal needs explicit user approval):** TypeScript, Next.js/SSR, Tailwind, zod, automated test frameworks, streaming/WebSocket deps, axios client-side, client-side AI SDKs/browser keys, MUI paid editions, helmet, rate-limit, jwt/bcrypt.
- **Never read/use these paths:** `C:/Users/girma/Desktop/beza/addis-ai-stt-api/addis_ai_chat.py`, `C:/Users/girma/Desktop/beza/glm52-test/`. Addis + providers come from official docs/SDKs (`addisai` SDK) only.
- **Scaffolding:** backend package.json via `npm init -y` + `npm pkg set type=module` + `npm install …`. Client via `npm create vite@latest client -- --template react` + `npm install …`. Never hand-write package.json. Lockfiles committed with their phase. Never commit `backend/.env` or any secrets.
- **Architecture:** DB-authoritative chat; `GET /api/meta/models` returns only providers with a present key in `backend/.env`. Collection names explicit: `assistantConversations`, `assistantMessages`, `assistantPresets` (MONGO_URI points at db `report-builder-v2` verbatim). `_id` everywhere (never `.id`).
- **Providers:** addis (addis-1-alef, SDK), gemini (2.5-flash w/ configurable thinkingBudget 0/1024/4096/16384; 2.0-flash), nvidia (meta/llama-3.3-70b-instruct), groq (qwen/qwen3-32b reasoning_effort none/default + reasoning_format parsed; llama-3.1-8b-instant), openrouter (deepseek-r1:free; llama-3.3-70b-instruct:free). One shared `openaiCompat` service (axios) for nvidia/groq/openrouter. Reasoning effort levels: Off/Low/Medium/High (per-conversation default + per-message override).
- **STT:** Addis AI only; ≤60s segments via ffmpeg split; sequential transcribe; merge. multer memory upload (25MB cap), ~300s soft recording cap. `child_process.execFile` (no new dep). Paths from `FFMPEG_PATH`/`FFPROBE_PATH`. Pipelines cleanup in `finally`.
- **Composer (X-Chat store-driven):** `forwardRef` wrapper `MuiChatComposer` exposing `focusInput()`/`replaceContent(text)` (→ `setValue` + focus). No react-hook-form in composer. For all RHF forms (preset dialog): `register` always; `Controller` only when `register` is genuinely impractical (documented exceptions); `watch`/`useWatch`/`useFormState` banned.
- **STRICT — JSDoc everywhere:** every function, method, and class gets a JSDoc block (`/** @param {type} name — meaning · @returns {type} meaning */`). No bare function without a doc block. Modules that export no functions carry a module-header comment.
- **STRICT — Arrow functions only:** all functions are declared as `const name = (...) => { … }`. Narrow exceptions where an arrow cannot be used: class constructors, generator functions (`function*`), and Mongoose schema methods/hooks/plugins that bind `this`.
- **Conventions:** no deprecated MUI props (v9 slot form + `slotProps={{ paper:… }}`); no magic values (`utils/constants.js` frozen UPPER_SNAKE + `config/env.js` frozen); no `console.log` backend (Winston only); arrow functions (mongoose hooks/methods/constructors excepted); kebab-case JS modules, PascalCase one-export React components, `Mui*` prefix in `client/src/components/reusable/`, no barrel files; JSDoc on functions; `express-async-handler`; provider routes kebab-case; envelope `{ success, message, data }`; pagination `{ docs, page, limit, totalDocs, totalPages }` via mongoose-paginate-v2; plain end-user error messages; keys only in `backend/.env` + `.env.example` committed.
- **Protocol:** per-phase branch (`phase-N-description`), never commit to main. **Every phase starts with DEEP ANALYSIS: read the entire codebase without skipping a single thing, build a super deep understanding of each file's responsibility and module relationships, verify consistency against the spec/plan, and log any drift/surprises in `progress.md` BEFORE writing code.** Then execute uncommitted → user review → explicit approval → `feat: phase N …` commit → push → merge → delete branch. `chore:` for hardening. No amend after push. Validation: `node --check` on backend JS; `vite build` 0 errors + `dist/` deleted; curl smoke; manual E2E record→transcribe→submit.
- **Open items (user to decide later):** visual identity direction + default theme mode. Theme = token-driven single file so it's a one-file change.

---

## Phases

### Phase 1 — Foundations ✅ DONE (pending review/commit)
**Status:** in_progress
- [x] Create `phase-1-foundations` branch
- [x] Write planning files (`task_plan.md`, `findings.md`, `progress.md`) — project root
- [x] Write `docs/superpowers/specs/2026-08-29-ai-assistant-design.md`
- [x] Write `docs/superpowers/plans/2026-08-29-ai-assistant.md`
- [x] Scaffold `backend/` (`npm init -y` → `type=module` → install deps)
- [x] Backend structure: `config/env.js`, `config/logger.js`, `models/`, `middleware/`, `utils/`, `app.js`, `server.js`
- [x] `.gitignore` + `backend/.env.example`
- [x] Mongo connect exponential-backoff retry (`config/mongo.js` `connectWithRetry` + `MONGO_RETRY` constants; `server.js` uses it)
- [x] JSDoc + arrow-function backfill across all Phase 1 files
- [x] Validate: `node --check` all JS; server boots; Mongo connect; negative test (unreachable MONGO_URI logs escalating retries)
- [ ] **STOP for user review → commit `feat: phase 1 foundations …` → push → merge → delete branch**

### Phase 2 — Data & APIs
**Status:** pending
- [ ] **Deep analysis first:** read the entire codebase without skipping; super deep understanding; log in `progress.md`
- Conversation CRUD (`GET|POST /api/conversations`, `PATCH|DELETE /:id`)
- Messages read (paginated `GET /api/conversations/:id/messages`)
- Preset CRUD (`GET|POST /api/presets`, `PATCH|DELETE /:id`)
- `express-validator` everywhere + error middleware + 404
- Validate: `node --check`; curl CRUD smoke
- STOP for review → commit → push → merge → delete branch

### Phase 3 — AI providers + STT
**Status:** pending
- [ ] **Deep analysis first:** read the entire codebase without skipping; super deep understanding; log in `progress.md`
- Provider catalog + `getMetaModels` key-gating
- `addis`, `gemini`, `openaiCompat` (nvidia/groq/openrouter) providers → normalize `{ content, reasoning }`
- `POST /api/chat` controller (load history → call → persist user+assistant → return assistant message)
- STT: multer upload, ffprobe/ffmpeg → ≤60s split, sequential Addis transcribe, merge, cleanup
- Validate: `node --check`; curl `/api/meta/models` (groq/openrouter hidden); real `/api/chat`; STT short + >60s sample
- STOP for review → commit → push → merge → delete branch

### Phase 4 — Chat UI
**Status:** pending
- [ ] **Deep analysis first:** read the entire codebase without skipping; super deep understanding; log in `progress.md`
- Scaffold `client/` (Vite react template → install)
- Theme token file (provisional; identity open) + redux store + RTK features
- X-Chat composition (layout, list, thread, header actions, message slots, empty overlay)
- `MuiChatComposer` forwardRef wrapper; chat adapter (ReadableStream from REST)
- `useVoiceRecorder` + STT wiring; presets dialog (RHF `register`)
- Validate: `vite build` 0 errors + `dist/` deleted; manual E2E
- STOP for review → commit → push → merge → delete branch

### Phase 5 — Polish
**Status:** pending
- [ ] **Deep analysis first:** read the entire codebase without skipping; super deep understanding; log in `progress.md`
- Dialogs/states (loading, error, empty), responsive drawer, a11y, locale texts (እያሰብኩ ነው…)
- Finalize theme when user chooses identity + mode
- Validate: full `vite build` 0 + `dist/` delete; manual record→transcribe→submit E2E; final cross-check
- STOP for review → commit → push → merge → delete branch

---

## Decisions Made
| # | Decision | Source |
|---|----------|--------|
| 1 | DB-authoritative chat (Option A) | User approval |
| 2 | Providers expanded beyond addis/gemini/nvidia (incl. groq + openrouter) | User reversal of earlier "exactly 3" |
| 3 | Composer = X-Chat store (`useChatComposer`), wrapped in forwardRef for STT; no RHF there | User choice (1 of 3) |
| 4 | RHF forms: `register` always; `Controller` only if genuinely impractical | User amendment |
| 5 | STT always Addis; ≤60s segments; ffmpeg split/merge | User rule |
| 6 | Explicit collection names (`assistant*`) since MONGO_URI db reused | User decision |
| 7 | `@mui/x-chat` fully Community/MIT (license verified) | Docs |
| 8 | Reasoning → X-Chat reasoning part; adapter emits chunk stream from REST | Plan |
| 9 | Model selector in `conversationHeaderActions` slot | Official example |
| 10 | Visual identity + theme mode OPEN (deferred; token-driven theme) | User instruction |
| 11 | Banned local paths never read/used | User instruction |
| 12 | `register` over `Controller` for all RHF; composer X-Chat store | User instruction |
| 13 | Mongo connect: infinite exponential-backoff retry (1s→30s, factor 2, serverSelectionTimeoutMS 5000) | User instruction |
| 14 | STRICT: JSDoc everywhere (functions/methods/classes; module headers for others) | User instruction |
| 15 | STRICT: arrow functions only (exceptions: class ctors, generators, moongoose `this`-binding hooks) | User instruction |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| _none yet_ | | |

## Next Step
Wait for user review of Phase 1 output, then commit Phase 1 (`feat: phase 1 foundations`), push, merge, delete branch, and start Phase 2 naming the single next action.

<｜DSML｜parameter name="lazy" string="false">true