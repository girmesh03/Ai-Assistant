# Phase 4 — Case-Driven Fix Log

Planning working file for the case-driven stabilization of **Phase 4 (chat UI)** on
branch `phase-4-chat-ui`. Every case is analyzed, recorded here, and applied here;
nothing else is closed until Phase 4 is green.

## Working agreement (user, 2026-08-29)

The current Phase 4 has too many issues to fix in one pass. So: **commit, push, but
do NOT merge**, then fix case by case.

- **Step 1** — User brings one or more cases (symptom/observation).
- **Step 2** — Deep analysis to find the solution (plan mode).
- **Step 3** — Note the analysis down in the planning working files, then apply the
  solution (build mode).
- **Step 4** — Ask the user for review. Based on feedback: go back to Step 1, or
  prepare for a new case.

### Strict requirements

1. **Do not override the existing plan** (`task_plan.md` stays untouched).
2. **Only commit when the user asks to commit.**
3. **Everything happens on `phase-4-chat-ui` (the current branch).**
4. **Everything must be traceable/knowable in the planning working files** —
   this log, `findings.md`, and `progress.md`.
5. **Move to the next phase only when Phase 4 is green.**

## Known open items (carried in from the first commit)

- Browser confirmation of the store-backed reload fix (new chat, send from empty
  state, preset apply/remove, model/reasoning change, delete, edit→regenerate).
- STT: mic-red → stops with nothing — recorder hardening + empty-transcript toast
  applied; the exact remaining cause (empty blob vs. empty transcript vs. plumbing)
  to be confirmed in-browser via the `[stt]` log + Network tab.
- Any remaining console warnings / runtime errors the user reports.

## Cases

### Case 003 — conversation layout: user right / assistant left + MUI X Chat streaming indicator (2026-08-30)
- **Reported:** (1) the user's request should render on the **right** side and the assistant's
  response on the **left**; (2) from the moment the user sends until the response is received,
  show **what MUI X Chat provides** — its built-in streaming indicator (per user, driven via
  the `mui-mcp` X Chat docs).
- **Root cause:**
  - Every `MessageRow` is a `Box display:flex` with the default `justifyContent:flex-start`,
    so both roles rendered left. The cards' `alignSelf:'flex-end'`/`'flex-start'` only affect
    the cross (vertical) axis — they never move a bubble sideways.
  - Streaming affordance was a hand-rolled text cursor `▍` inside the assistant bubble, and
    nothing indicated the "waiting" window between send and the first assistant token. With a
    custom `renderItem` on headless `MessageList.Root`, X Chat renders **no** trailing
    streaming row and accepts **no** `features` flag — the flag and the auto waiting row
    (`DefaultMessageItem.js`) exist only for the material default row we don't use.
- **Fix:**
  - `MuiChatSurface.jsx` (only): `MessageRow` now sets
    `justifyContent: isUser ? 'flex-end' : 'flex-start'` — user bubbles hug the right edge
    (card already caps at `maxWidth` 96%/78%), assistant stays left. Added `StreamingWaitingRow`
    below the message list, gated by headless `useStreamingIndicatorVisibility('auto') →
    {waiting}`: a left-aligned assistant-styled bubble (ሰላም caption + MUI X Chat's animated
    three-dot `ChatStreamingIndicator`). `'auto'` + `members` with `role:'assistant'`
    (`ChatPage.jsx:67`) shows it even for a brand-new conversation's first message.
  - `MuiAssistantMessageCard.jsx`: replaced the `▍` caret with the built-in
    `<ChatStreamingIndicator message={message} />` under the streamed text (same after-content
    wiring as material `ChatMessage`); the dots vanish automatically once the message leaves
    `streaming`.
  - `MuiUserMessageCard.jsx`: dropped the now-misleading `alignSelf:'flex-end'`.
- **R2 (2026-08-30, small user-requested refinements):**
  - **User bubble = assistant colors:** `MuiUserMessageCard.jsx` — bubble `bgcolor` `primary.main`
    → `background.paper`, `color` `primary.contrastText` → `text.primary`, plus the assistant's
    `border:1 borderColor:'divider'` so both roles read identically.
  - **Scroll-to-bottom affordance:** user asked to "pass `features={{ scrollToBottom: true }}`".
    Verified it is a material-`ChatBox`-only flag (default `true`); a `features` prop on headless
    `MessageList.Root` is silently forwarded onto the scroller DOM (no effect). Reproduced it the
    way `ChatBox` does internally (`ChatBoxContent.js:842`): `MuiChatSurface.jsx` now passes
    `overlay={<ChatScrollToBottomAffordance />}` (from `@mui/x-chat/ChatIndicators`, export
    verified) to `MessageList.Root` — the self-hiding jump-to-latest button that shows only when
    scrolled away from the bottom.
- **Verification:** `npm run lint` 0 + `npm run build` ✓ (dist removed; servers :3000/:4000
  untouched). Browser pass pending: send → user bubble right, assistant left; waiting dots
  under the list right after send; dots inside the assistant bubble while tokens stream; no
  dots after `sent`; edit→regenerate shows the same flow.
- **R3 (2026-08-30, edit-request refinements):**
  - **Reported:** on edit, the card must fully expand (max height, reviewable whole request),
    the pencil should swap to an Update icon, and clicking Update must collapse the card then
    send → stream with everything below the edited turn gone.
  - **Fix (`MuiUserMessageCard.jsx` only):** edit textarea keeps `register('text')`
    (uncontrolled — **strict zero-typing-lag requirement**, no `Controller`/`watch`/
    `value`+`onChange` added) with a static 400px `maxHeight`, `overflowY:'auto'`, and the
    scrollbar visually hidden (`scrollbarWidth:'none'` + `::-webkit-scrollbar{display:none}`) —
    wheel still reaches text beyond 400px; inline CheckIcon submit removed, form given
    `id="selam-user-edit-{message.id}"`; action bar now shows an **Update** (Check) button
    (`type="submit" form={formId}`) in the pencil's slot while editing (pencil returns when
    done), Copy stays, collapse toggle hidden while editing; `onSubmitEdit` sets
    `setCollapsed(true)` + `setEditing(false)` after a real change → card collapses to the
    2-line clamp immediately and the regenerate flow continues with the streaming indicator.
    Truncate-below on update needs **no code** — `actions.regenerate` already removes the old
    reply + everything below from the store before streaming (backend truncates too).
  - **Verification:** lint 0, build ✓. Browser pass pending; nothing committed.
- **R4 (2026-08-30, R3 edit never engages with a real click):**
  - **Reported:** clicking the pencil expands the card but inline edit never engages (no
    textarea, no pencil→Update swap, can't type). "Simply see the diff what was there first
    b/c it was working before."
  - **Root cause (investigation):** the pencil's `openEdit` handler is byte-identical to the
    last-known-good `482d01d`; the diff against that commit shows the only edit-flow changes
    R3 made are (a) a cross-element form linkage — Update button
    `type="submit" form={formId}` replacing the inline form button — and (b) `autoFocus` on a
    now-auto-growing `maxHeight:400` textarea. Headless clean-Chrome repro (real CDP
    `Input.dispatchMouseEvent` clicks) reproduced the exact user symptom: a real click fires
    `pointerdown`+`click` on the Edit button (hit target = SVG path inside it) and expands the
    long card (line-clamp `2`→`none`) but edit mode never renders; programmatic `el.click()` on
    the same element opens edit on both short and long cards. Ruled out: scroll-to-bottom
    affordance (button centered at bottom, `pointer-events:auto` only on itself), row
    recycling (headless `getItemKey` default `id => id`), roving focus (unused by custom rows),
    stale HMR (vite :3000 serves the current module, verified via curl). Conclusion: the
    fragility is the real-pointer event→render pipeline interacting with the virtualized list
    during edit mount (autoFocus auto-scroll vs. row re-measure) plus the `form=` cross-element
    submit — not the unchanged `openEdit` body.
  - **Fix (`MuiUserMessageCard.jsx` only):** (1) Update (✓) button back to a plain
    `IconButton onClick={handleSubmit(onSubmitEdit)}` — removed `type="submit" form={formId}`
    and the form `id`; (2) textarea `autoFocus` removed, replaced by `inputRef` +
    `requestAnimationFrame` focus effect on `editing` (no browser auto-scroll inside the
    virtualizer); (3) kept every R3 behavior — 400px cap + hidden scrollbar, pencil→✓ swap,
    collapse + regenerate on save. All text registers stay uncontrolled (zero-typing-lag rule).
  - **Verification:** lint 0, build ✓, dist removed, servers untouched. User re-tests in
    browser (assistant does no live testing this round). Nothing committed.
  - **Review:** ✓ user confirmed edit now engages; reopened as R5 (width + truncate-below +
    Retry parity).
- **R5 (2026-08-30, edit engages but width wrong + below not truncated; Retry must match):**
  - **Reported:** edit now engages, but (1) on edit the card width is not correct; (2) after
    Update, responses below the edited turn do not go away. Plus: the same truncate-below
    semantics must hold for **Retry** — both for the **last** response and for responses
    **below** a retried reply (they get removed).
  - **Root cause:**
    - *Width:* the card is a shrink-to-fit flex item (`maxWidth` only, no `width`); in edit
      mode the multiline textarea drags the bubble down to its intrinsic ~20ch minimum, so
      the card collapses while display text wraps to the full 78%/96% cap.
    - *Truncate-below:* ① the X-Chat runtime `regenerate` only removes the anchor's
      **assistant run** — `resolveRegenerateAnchor` (`sendMessageActions.mjs:226`) walks
      forward deleting assistant messages only *until the next user turn* — so later user
      turns + replies survive in the store; ② the store is never corrected because the
      post-stream reload **races**: `pendingReloadRef` was set in the card's
      `actions.regenerate().then(...)` *after* the final store flush (status→`sent`,
      `setStreaming(false)`), so the `[messages]` watcher had already run its only window
      with the flag still `false` and nothing re-triggered it; ③ the runtime never patches
      the anchor user message's parts, so the edited text itself only ever appears via that
      reload. Retry had the same gaps and no reload callback at all.
  - **Fix (4 files):**
    - `MuiUserMessageCard.jsx`: (1) card `Box` gains `width: editing ? '100%' : undefined`
      (edit bubble snaps to the 78%/96% cap — matches the long card's display width);
      (2) `onSubmitEdit` now bails when `store.state.isStreaming` (runtime would no-op; never
      truncate then), then **mirrors truncate-below in the store before regenerating**:
      `store.setMessages(ids.slice(0, anchorIndex + 1))` with the anchor's parts swapped to
      `[{ type:'text', text: trimmed }]` — edited text visible + everything below gone the
      instant Update is clicked.
    - `MuiAssistantMessageCard.jsx`: gains an `onSaved` prop; `handleRetry` bails while
      streaming, resolves the anchor = nearest preceding `role:'user'` message (walking
      `store.state.messageIds`), truncates the store below the anchor the same way, then
      `actions.regenerate(anchorId).then(() => onSaved(conversationId))`. Passing the
      **anchor user id** (not the assistant id) is required — after truncation the assistant
      id is gone, and `resolveRegenerateAnchor` would resolve it to `null` and skip.
    - `MuiChatSurface.jsx`: `MessageRow` passes `onSaved={onEdited}` to the assistant card
      too.
    - `ChatPage.jsx`: dropped `pendingReloadRef` + the `[messages]` watcher (and the now
      unused `useEffect` import / local vars); `handleEdited(conversationId)` reloads
      **deterministically** when regeneration completes:
      `reloadMessages(conversationId ?? chat.activeConversationId).then(() => reloadConversations())`.
      The reload is the guaranteed backend re-sync (authoritative truncate + edited text).
  - **Verification:** lint 0, build ✓, dist removed. User re-tests Edit width + truncate-below
    and Retry (last + mid-thread) in the browser. Nothing committed.
  - **Review:** ✓ R5 applied — user confirms Retry removes below responses and the new reply
    streams. Edit confirmed that truncate-below WORKS too; reopened as R6 (Update must disable
    when content unchanged; regenerated reply "leaving a space" instead of replacing in place;
    no mouse-wheel scroll on the edit textarea).
- **R6 (2026-08-30, edit polish: disable-unchanged Update, reply gap/space, edit-textarea wheel scroll):**
  - **Reported:** after R5 — (1) the Update icon must be disabled while the content is
    unchanged; (2) on Update, below-responses DO go away and streaming+response arrive, but
    the reply is "displayed leaving a space" instead of replacing the old responses in place;
    (3) while the edit card is expanded, the mouse wheel can't scroll the textarea — only the
    keyboard arrows scroll it.
  - **Root cause:**
    - *(1) Disable:* the Update button was always enabled; nothing tracked whether the
      content actually changed.
    - *(2) Space:* `onSubmitEdit` forced `setCollapsed(true)` on save — the long edited card
      snapped to its 2-line clamp + ellipsis while its row still held the tall
      (textarea-expanded) measured height in the virtualized list, so a blank gap sat between
      the edited message and the regenerated reply (which renders directly beneath the anchor).
      The reply itself is otherwise correctly placed (the runtime `store.addMessage` appends at
      the end, right after the anchor).
    - *(3) Wheel:* no `onWheel` route exists on the textarea and CSS hides the scrollbar
      (`scrollbarWidth:'none'` + `::-webkit-scrollbar{display:none}`); wheel events bubble to /
      chain with the outer virtualized list scroller instead of moving the textarea's own
      `scrollTop` (keyboard scroll proves the textarea is the scrollable container).
  - **Fix:**
    - `MuiUserMessageCard.jsx`: new `dirty` state toggled by a composed RHF `register` onChange
      (no `watch`) and reset in `openEdit`; the Update IconButton gets `disabled={!dirty}`;
      removed `setCollapsed(true)` from `onSubmitEdit` (card stays expanded after save, so the
      reply visually replaces in place — manual expand/collapse button untouched); added
      `handleEditWheel` on `slotProps.htmlInput`: when the textarea has overflow it
      `preventDefault()`s and does `el.scrollTop += deltaY`, and at its top/bottom boundary it
      returns so the message list scrolls instead; the `onSaved`/reload is now **gated** on the
      store actually gaining a new message (`messageIds.length > truncatedLength`) so a silent
      regenerate skip/error can never restore stale backend below-turns.
    - `MuiAssistantMessageCard.jsx`: same reload gate in `handleRetry` (symmetric with Edit).
  - **Verification:** lint 0, build ✓, dist removed. User re-tests Update-disable, gap/space,
    and mouse-wheel scroll on the edit textarea in the browser. Nothing committed.

### Case 002 — preset dialog: the three selects don't show picked values, and the
model/reasoning lists don't vary by provider (2026-08-30)
- **Reported:** while creating/editing a preset, choosing a provider/model/reasoning leaves
  the field displaying "Not set" (the picked value never appears), the model list stays
  static instead of narrowing to the selected provider, and reasoning is offered regardless
  of the model's `reasoning` capability.
- **Root cause:** `MuiPresetDialog.jsx` bound the three MUI text selects with
  `value={getValues('...')}` and filtered the model menu by
  `selectedProvider = getValues('modelProviderId')`. `getValues` reads the RHF store without
  subscribing — verified in the installed `react-hook-form@7.86.0` (`useForm` returns a
  `useMemo` keyed on stable function identities; no re-render on value change) — so after a
  selection nothing re-renders: field displays stay stale and the provider-conditioned model
  list is frozen at `''`. The reasoning select always listed all levels with no
  model-capability gate.
- **Fix (`MuiPresetDialog.jsx` only):** the three selects now use react-hook-form
  **`Controller`** (the RHF-documented approach for fully-controlled MUI Selects; recorded as
  the strict-UI-rule #3 exception). Local `useState` mirrors `providerId` and the pinned
  catalog model so the UI is reactive:
  - provider change → updates the value, auto-selects that provider's first model (`''` on
    "Not set"), and clears reasoning when that model can't reason;
  - model options filtered by the live `providerId`;
  - reasoning select disabled + cleared when the pinned model has `reasoning:false` (with a
    caption), enabled otherwise;
  - `handleSave` forces `reasoningEffort:null` when the pinned model can't reason
    (defense-in-depth; also sanitizes older presets while editing).
  `name`/`prompt`/`persona` stay on `register`.
- **Verification:** `npm run lint` 0 + `npm run build` ✓. Browser pass (create → provider
  pick narrows the model list + pre-selects first model → reasoning gating on
  addis-1-alef vs gemini-3.6-flash → edit prefill) pending.
- **Review:** <pending>

### Case 001 — chat settings (language/reasoning/model/preset) unusable on landing
- **Reported:** 2026-08-30 — Four related observations on the chat page: (1) on xs the
  language/reasoning/model controls should collapse to icons; (2) on xs/sm everything a
  conversation-header wraps must sit in the AppBar left of the "new chat" (Add) icon, and
  Add only shows once at least one conversation exists; (3) language/reasoning/model/preset
  are only visible after `createChat` — they must be visible on landing (empty state) so the
  user can pick before starting, with defaults applied when they don't; (4) the language
  picker currently does nothing.
- **Root cause:**
  - The whole settings row lives inside `{activeConversation && …}` (`ChatPage.jsx:306`), so
    with no active conversation zero controls render. `createChat` therefore always seeds the
    catalog default model + hardcoded `reasoningEffort:'off'`, `language:'en'`
    (`chatAdapter.js:276-277`); suggested-prompt clicks send instantly with those — settings
    never "sense" user intent.
  - `MuiLanguagePill` is a **read-only chip** — there is no language *changer* in the app, so
    "language selection does nothing" is literally true (backend PATCH already accepts
    `language`, `conversationRoutes.js:48,94`; STT already uses it).
  - Reasoning selector renders unconditionally although the catalog exposes
    `reasoning: boolean` per model (addis/nvidia false → selector should hide).
  - Mobile layout never placed conversation controls in the AppBar and always showed Add.
- **Fix (decisions):** prefs live in a new dedicated Redux slice `settings`
  (`client/src/redux/features/settingsSlice.js`) — survives remounts, shared with sidebar
  New chat / prompt-click / preset-apply with zero threading. Controls render **always**
  (desktop row + mobile AppBar), read `activeConversation.metadata` when active else the
  `settings` prefs, and **write-through**: every change updates prefs and PATCHes the active
  conversation when one exists, so the last choice carries into the next New chat. Language
  options are per-model: Addis `addis-1-alef` → **en/am/om**, every other model → **en/am**
  (en forced for non-Addis because those adapters ignore `language` today). Reasoning control
  shown only when the selected model has `reasoning:true`. Mobile (xs/sm): AppBar =
  Menu + brand, then right-aligned icons on xs (selects on sm), preset, and **Add rendered
  only when `conversations.length > 0`**; conversation title dropped on mobile (brand is the
  heading); delete stays in drawer rows. STT uses the prefs language when no conversation yet.
- **Fix (files):** new `settingsSlice.js`, new `MuiLanguageSelector.jsx` (replaces
  `MuiLanguagePill.jsx`), `constants.js` (+`MODEL_LANGUAGES`, `languagesForModel`),
  `store.js`, `useConversationActions.js` (seed prefs at create/apply), `ChatPage.jsx`
  (always-visible settings, AppBar restructure, Add gating, reasoning gating, language
  reset-on-model-change), `MuiReasoningSelector`/`MuiModelSelector` (+compact/slim variants).
- **Verification:** `npm run lint` + `npm run build` clean; Node E2E against live backend —
  create with prefs (model/reasoning/language persisted), apply preset seeds language from
  prefs, model-switch resets unsupported language to en. Browser eyeball still pending.
- **Review (R1):** analysis approved → implemented + verified. **R2 (browser, below):** four
  observations → fixed. R3 pending.

### Case 001 — R2: four browser review items (2026-08-30)
- **Reported:** eyeballing R1 in Chrome: (1) on md+ the language/reasoning/model/preset
  actions sit at the LEFT edge of the desktop header when no conversation is active — they
  belong at the right end; (2) on landing (default Addis model) the language picker cannot
  select `om` — only en/am listed; (3) tooltip arrows render at the bottom — must be top;
  (4) DevTools console warns `MUI: The ':focus-visible' pseudo class is not supported in
  this browser.`.
- **Root cause:**
  1. The desktop header row right-aligns only through the active-conversation title block
     (`flex:1`, `ChatPage.jsx:501`); with no active conversation that block is absent, so
     `desktopControls` stay flush-left.
  2. `languageOptions = languagesForModel(displayModelId)` (`ChatPage.jsx:115`) where
     `displayModelId = settings.modelId` is **null on landing** → falls back to
     `DEFAULT_MODEL_LANGUAGES` ['en','am'] — `om` missing even though the model selector
     (via `selectModelInfo` fallback) already shows addis-1-alef.
  3. Tooltips used MUI's default `placement="bottom"`.
  4. `@mui/utils/isFocusVisible.mjs:4-14` — dev-only warn fired when
     `element.matches(':focus-visible')` throws (SyntaxError) on a runtime Chromium that
     rejects the selector. Theme does **not** enable the v9.4 opt-in `focusVisible` CSS
     indicator, so the new feature is NOT the trigger. MUI keeps keyboard focus indication
     via its manual keyboard/mouse fallback; the warning is dev-only.
- **Fix (`ChatPage.jsx`):** (1) `desktopControls` wrapped in
  `Box sx={{ ml:'auto', display:'flex', alignItems:'center', gap:1.25 }}` so they hug the
  right end with or without an active conversation; (2)
  `languagesForModel(modelInfo?.id ?? displayModelId)` (modelInfo already resolves to the
  catalog record incl. `id`) → `om` listed for default addis-1-alef; (3) `placement="top"`
  on the five chat-page Tooltips (Remove preset, Apply a preset ×2, Delete conversation,
  New chat); (4) **no code change** — environment issue; confirm via
  `CSS.supports('selector(:focus-visible)')` (false ⇒ old/embedded Chromium; updating to a
  current browser resolves it; production builds never log it).
- **Verification:** `npm run lint` 0 + `npm run build` ✓. Browser R3 eyeball pending.
- **Review:** <pending R3>

<!-- One entry per case, newest on top. Template:
### Case N — short title
- **Reported:** <date> — <user observation>
- **Root cause:** <analysis>
- **Fix:** <files changed + what>
- **Verification:** <how verified>
- **Review:** <user verdict/status>
-->