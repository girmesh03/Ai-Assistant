# Ai-Assistant — Design Spec

**Date:** 2026-08-29 · **Status:** Approved (final) · **Owner:** user

Goal: a single-user, multi-provider AI chat assistant ("Ai-Assistant") with conversation history, prompt presets, Amharic/Ethiopic support, and Addis-AI-only voice input (60s auto-split STT). Built in the empty repo at `C:\Users\girma\Desktop\beza\1.Ai-Assistant\Ai-Assistant`.

---

## 1. Tech Stack

- **Backend:** Node.js · Express `^5.2.1` · Mongoose `^9.9.3` · port `4000` · ESM (`"type": "module"`).
- **Client:** React `^19.2.8` · Vite `^8.2.2` · MUI v9 · Redux Toolkit (RTK Query, `fetchBaseQuery` only) · port `3000`.
- Git: repo exists, branch `main`, no commits. Greenfield.

## 2. Permanent Exclusions (reversal requires explicit user approval)

TypeScript, Next.js/SSR, Tailwind, zod, automated test frameworks, streaming/WebSocket server deps, axios client-side, client-side AI SDKs/browser keys, MUI paid editions, helmet, rate-limit, jwt/bcrypt.

**Never read/use:** `C:/Users/girma/Desktop/beza/addis-ai-stt-api/addis_ai_chat.py` and `C:/Users/girma/Desktop/beza/glm52-test/`. Addis + provider integrations from official docs/SDKs only.

## 3. Dependencies

**Backend (runtime):** `express@^5.2.1`, `mongoose@^9.9.3`, `cors`, `dotenv`, `express-async-handler`, `express-validator`, `multer`, `addisai@^0.2.0`, `axios`, `winston`, `winston-daily-rotate-file`, `mongoose-paginate-v2` · **(dev):** `morgan`, `nodemon`.

**Client (runtime):** `@emotion/react`, `@emotion/styled`, `@fontsource/inter`, `@fontsource/noto-serif-ethiopic`, `@mui/icons-material@^9.3.1`, `@mui/material@^9.3.1`, `@mui/x-chat@9.0.0-alpha.17`, `@reduxjs/toolkit@^2.12.0`, `dayjs`, `react@^19.2.8`, `react-dom`, `react-error-boundary`, `react-hook-form@^7.86.0`, `react-redux`, `react-router@^8.3.0`, `react-toastify` · **(dev):** `@eslint/js`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `vite@^8.2.2`.

**Scaffolding rule:** backend package.json via `npm init -y` → `npm pkg set type=module` → `npm install …`. Client via `npm create vite@latest client -- --template react` → `npm install …`. Never hand-write package.json. Lockfiles committed with their phase.

`@mui/x-chat` is fully **Community/MIT** (docs: every Chat feature ships in Community; no Pro/Premium tier) — no license key.

## 4. Architecture — DB-Authoritative Chat (Option A)

`POST /api/chat { conversationId, content, reasoningEffort? }`:
1. Server loads full history from Mongo.
2. Server calls the conversation's provider/model.
3. Server persists the user message and the assistant message.
4. Server returns `{ conversationId, message }` where `message` is the assistant `Message` record.

The client adapter wraps this non-streaming response in a local `ReadableStream` (chunk protocol: `start → reasoning-start/delta/end (if any) → text-start/delta/end → finish`) so X-Chat renders smoothly.

## 5. Provider Catalog + Reasoning

- **Catalog** is a frozen `utils/constants.js` structure. Per model: provider, id, display name, reasoning support/behavior, free-tier notes.
- **Key gate:** `GET /api/meta/models` returns only providers whose API key is present in `backend/.env` (presence check, never values).
- **addis** — `addis-1-alef`, via `addisai` SDK. No reasoning.
- **gemini** — `gemini-2.5-flash` (reasoning via `thinkingConfig.thinkingBudget` ∈ {0,1024,4096,16384}), `gemini-2.0-flash` (none).
- **nvidia** — `meta/llama-3.3-70b-instruct`, OpenAI-compatible. No reasoning.
- **groq** — `qwen/qwen3-32b` (reasoning via `reasoning_effort: none|default` + `reasoning_format: parsed`), `meta-llama/llama-3.1-8b-instant`.
- **openrouter** — `deepseek/deepseek-r1:free` (reasoning always-on), `meta-llama/llama-3.3-70b-instruct:free`.
- **Shared** `openaiCompat` service (axios) serves nvidia/groq/openrouter; per-provider adapters normalize to `{ content, reasoning }`.
- **Reasoning effort levels:** `Off | Low | Medium | High`. Per-conversation default + per-message override; mapped to model config in the frozen catalog.

## 6. Data Models (explicit collection names)

`MONGO_URI` barely points at Atlas db `report-builder-v2` — used verbatim; **all collections explicit** to avoid collisions.

- **Conversation** → collection `assistantConversations`: `title`, `modelProviderId`, `modelId`, `reasoningEffort` (default), `language`, `presetId?`, timestamps.
- **Message** → collection `assistantMessages`: `conversationId` (indexed), `role` (`user`|`assistant`), `provider`, `model`, `content`, `reasoning` (nullable), `reasoningEffort?` (message override), timestamps. Uses `mongoose-paginate-v2`.
- **Preset** → collection `assistantPresets`: `name`, `prompt`, optional preferred `provider`/`model`/`reasoning`, timestamps.

`_id` everywhere (never `.id`).

## 7. REST API

Envelope: `{ success, message, data }`. Pagination payload: `{ docs, page, limit, totalDocs, totalPages }`.

- `GET /api/meta/models`
- `GET /api/conversations` · `POST /api/conversations` · `PATCH /api/conversations/:id` · `DELETE /api/conversations/:id`
- `GET /api/conversations/:id/messages?page=&limit=`
- `POST /api/chat` `{ conversationId, content, reasoningEffort? }` → `{ conversationId, message }`
- `POST /api/speech/transcribe` (multipart `audio`) → `{ text, segments }`
- `GET /api/presets` · `POST /api/presets` · `PATCH /api/presets/:id` · `DELETE /api/presets/:id`

Validation via `express-validator`; controllers via `express-async-handler`; plain end-user error messages; error + 404 middleware; `config/env.js` frozen.

## 8. STT Pipeline (Addis AI only — never another provider)

Client: dependency-free `useVoiceRecorder` (MediaRecorder, webm/opus), soft auto-stop at ~300s, mic button bottom-right of composer. States: idle → recording → processing (loading on mic icon) → success (fills composer via `replaceContent(text)` + success toast) | error (error toast). Then the user submits to the selected LLM.

Server (`POST /api/speech/transcribe`): multer memory upload (25MB cap) → temp file → `ffprobe` validate (≥1s, get duration) → `ffmpeg` split into ≤60s segments (1s overlap, transcoded) → sequential `addisai` `speech.transcribe` per segment → merge → `{ text, segments }` → cleanup in `finally`. Uses `child_process.execFile` (no new dep). Binary paths from `FFMPEG_PATH` / `FFPROBE_PATH` env vars.

## 9. Client UI (X-Chat composition)

```
ChatLayout (headless)              two-pane; conversationsPane fixed 280px; threadPane flex; parent Box sets height
  ChatConversationList             sidebar; responsive drawer <600px (aria-labels on rail/back)
  ChatConversation                 thread shell (reads active conversation via ChatProvider context)
    ChatConversationHeader         divider-styled header
      ChatConversationHeaderInfo
        ChatConversationTitle      conversation name
        ChatConversationSubtitle   model + reasoning effort (secondary line), or language
      ChatConversationHeaderActions model Select + reasoning Select + language pill; hidden when !hasConversation
    ChatMessageList                virtualized scroller, auto-scroll; overlay slot = ሰላም Selam empty state; date divider OFF
      ChatMessageGroup             groups same-author; avatar only on first
        ChatMessage                bubble row; status lifecycle pending→sending→streaming→sent|error
          ChatMessageAvatar        assistant brand avatar (initials fallback); user block-letter
          ChatMessageContent       bubble + part renderers; reasoning disclosure restyled (gold, እያሰብኩ ነው…)
          ChatMessageInlineMeta    in-bubble timestamp + status
          ChatMessageActions       hover: copy / retry (resend) / delete
    ChatComposer (X-Chat store)    border-top form
      ChatComposerTextArea         auto-resizing
      ChatComposerToolbar          [🎤 Mic] + ChatComposerSendButton
      ChatComposerAttachButton     OMITTED (no file upload in scope)
```

- **Composer:** native `ChatComposer` + `useChatComposer()` (store-driven). Wrapped in a `forwardRef` component (`MuiChatComposer`) exposing imperative `focusInput()` / `replaceContent(text)` (→ `setValue` + focus) for STT. Zero-lag via granular store (only composer subtree re-renders). No react-hook-form in the composer.
- **Model/reasoning selectors:** MUI `Select`s in `ChatConversationHeaderActions`; state hoisted; adapter rebuilt with `React.useMemo`.
- **Streaming feel:** adapter `sendMessage` returns a `ReadableStream` built from the REST response; X-Chat renders the collapsible Thinking disclosure (labels overridable to `እያሰብኩ ነው…`).
- **History:** `ChatAdapter.listMessages()` paginated on scroll-to-top (`hasMore`).
- **Forms (e.g., preset dialog):** react-hook-form — **`register` always; `Controller` only when `register` is genuinely impractical (documented exceptions); `watch`/`useWatch`/`useFormState` banned.**
- **Theme:** token-driven single file `client/src/theme/`; provisional neutral default; **visual identity + default theme mode deferred by user** (one-file change later).
- **State:** Redux Toolkit store + RTK Query features (conversations, messages, presets, chat, speech, meta) via `fetchBaseQuery`.

## 10. Engineering Conventions

No deprecated MUI props (v9 slot form + `slotProps={{ paper:… }}`); no magic values (`utils/constants.js` frozen UPPER_SNAKE + `config/env.js` frozen); no `console.log` backend (Winston daily-rotate only); **JSDoc everywhere — every function, method, and class carries a `@param`/`@returns` block; modules with no functions carry a header comment**; **arrow functions only — `const name = (…) => {…}`, with narrow exceptions for class constructors, generator functions, and Mongoose schema `this`-binding methods/hooks/plugins**; kebab-case JS modules, PascalCase one-export React components, `Mui*` prefix in `client/src/components/reusable/`, no barrel files; JSDoc on functions; `_id` everywhere; `express-async-handler`; provider routes kebab-case; keys only in `backend/.env` (+ committed `.env.example`); envelope + pagination shapes (above); plain end-user error messages; MongoDB connection uses an infinite exponential-backoff retry (initial 1000ms → max 30000ms, factor 2, per-attempt `serverSelectionTimeoutMS` 5000).

## 11. Version Control Protocol

Per phase: `phase-N-description` branch (never commit to main) → **DEEP ANALYSIS first: read the entire codebase without skipping a single thing, build a super deep understanding of every file's responsibility and module dependencies, verify consistency against this spec/plan, and log any drift/surprises in `progress.md` before writing code** → execute uncommitted → user review + approval → `feat: phase N …` → push → merge → delete branch. `chore:` for hardening. No amend after push. Never commit `backend/.env`.

## 12. Phases + Validation

1. **phase-1-foundations** — branch; planning files + spec + plan docs; scaffold backend; structure; `.gitignore`/`.env.example`. Validate: `node --check`, server boot + Mongo connect smoke.
2. **phase-2-data-apis** — conversations CRUD, messages (paginated), presets CRUD + validation. Validate: `node --check`, curl CRUD smoke.
3. **phase-3-ai** — catalog + key gate, providers + `openaiCompat`, `POST /api/chat`, STT split/merge. Validate: `node --check`, curl `/api/meta/models` (no groq/openrouter), real `/api/chat`, STT short + >60s.
4. **phase-4-chat-ui** — client scaffold; theme/store; X-Chat composition; composer wrapper; adapter; `useVoiceRecorder` + STT wiring; presets dialog. Validate: `vite build` 0 + `dist/` deleted; manual E2E.
5. **phase-5-polish** — dialogs/states, responsive drawer, a11y, locale texts, theme finalized when user chooses identity. Validate: full `vite build` 0 + `dist/` delete; record→transcribe→submit E2E; final cross-check.

Each phase STOPS for user review before commit/push/merge.

## 13. Open Items

- Visual identity direction (A "Verdant manuscript" / B "Midnight" / custom) — **open**.
- Default theme mode (system / light / dark) — **open**.
- Any further user changes.