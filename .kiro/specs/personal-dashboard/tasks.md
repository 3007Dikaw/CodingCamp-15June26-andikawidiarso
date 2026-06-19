# Implementation Plan: Personal Dashboard

## Overview

Implement a zero-dependency, single-page personal dashboard as three static files (`index.html`, `css/style.css`, `js/app.js`). All state is persisted in `localStorage`. The build is organized into five widget modules plus a shared Storage module, bootstrapped by `App.init()` on `DOMContentLoaded`.

---

## Tasks

- [ ] 1. Set up project structure and HTML skeleton
  - Create `index.html` with semantic widget containers: `#greeting`, `#focus-timer`, `#todo-list`, `#quick-links`, and the theme toggle button
  - Add `<link>` to `css/style.css` and `<script defer>` to `js/app.js` in `index.html`
  - Create empty `css/style.css` and `js/app.js` placeholder files
  - _Requirements: 9.4, 9.5, 10.1_

- [ ] 2. Implement Storage module
  - [ ] 2.1 Implement `Storage` module in `app.js`
    - Write `Storage.init()` with write/read/delete probe in `try/catch` to set `Storage.available`
    - Write `Storage.get(key, fallback)` returning parsed JSON or fallback on error
    - Write `Storage.set(key, value)` serialising to JSON; no-op when `available === false`
    - Write `Storage.remove(key)` removing a key
    - Insert DOM warning banner when `Storage.available === false`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 2.2 Write property test for Storage serialisation round-trip
    - **Property 13: Storage serialisation round-trip**
    - For any valid `Task[]` or `Link[]`, `Storage.set` then `Storage.get` SHALL return a deep-equal array
    - **Validates: Requirements 8.2, 8.3**

- [ ] 3. Implement Theme Toggle
  - [ ] 3.1 Implement `ThemeToggle` module in `app.js`
    - Write `ThemeToggle._applyTheme(theme)` adding/removing `dark` class on `document.documentElement` and persisting to `pd_theme`
    - Write `ThemeToggle._toggle()` reading current theme and calling `_applyTheme` with the opposite value
    - Write `ThemeToggle.init(buttonEl)` reading `pd_theme` from Storage (default `"light"`) and calling `_applyTheme` before first paint
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 3.2 Write property test for theme persistence round-trip
    - **Property 12: Theme persistence round-trip**
    - For any theme value (`"light"` or `"dark"`), after `_applyTheme(theme)`, `Storage.get("pd_theme")` SHALL return the same value
    - **Validates: Requirements 7.3, 7.4**

- [ ] 4. Implement CSS theming foundation
  - [ ] 4.1 Write CSS custom properties and base layout in `style.css`
    - Define `:root` custom properties: `--color-bg`, `--color-text`, `--color-surface`, `--color-accent`, etc.
    - Define `html.dark` overrides for all custom properties
    - Write responsive grid/flex layout accommodating widths 320px–1920px without horizontal scroll
    - Apply minimum body font size of 14px and a consistent typographic scale
    - Ensure text/background contrast meets WCAG 2.1 AA (4.5:1 minimum) for both themes
    - Add card-style containers with spacing/borders to visually separate widgets
    - _Requirements: 7.1, 7.2, 9.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 5. Implement Greeting Widget
  - [ ] 5.1 Implement `GreetingWidget` module in `app.js`
    - Write `GreetingWidget._getGreeting(hour)` mapping hour 0–23 to one of the four greeting strings
    - Write `GreetingWidget.tick()` creating a new `Date`, updating time (HH:MM), date (human-readable), and greeting DOM elements
    - Write `GreetingWidget._renderName()` reading `pd_name` from Storage and appending to greeting if present
    - Write `GreetingWidget._saveName(rawInput)` trimming, truncating at 50 chars, persisting to `pd_name`, then calling `_renderName()`
    - Write `GreetingWidget.init(containerEl)` wiring inline-edit control, calling `_renderName()` and `tick()`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 5.2 Write property test for greeting text mapping
    - **Property 1: Greeting text matches hour**
    - For every integer hour 0–23, `_getGreeting(hour)` SHALL return exactly one of the four valid strings, consistent with the defined ranges
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6**

  - [ ]* 5.3 Write property test for name truncation
    - **Property 2: Name truncation at 50 characters**
    - For any input string length > 50, stored value length SHALL be exactly 50; for length ≤ 50, stored value SHALL equal trimmed input
    - **Validates: Requirements 2.5, 2.6**

- [ ] 6. Implement Focus Timer
  - [ ] 6.1 Implement `FocusTimer` module in `app.js`
    - Write `FocusTimer._setDuration(minutes)` validating range [1, 99], persisting to `pd_timer_duration`, resetting display
    - Write `FocusTimer._render()` updating MM:SS display and enabling/disabling controls based on current state (`IDLE`, `RUNNING`, `PAUSED`, `DONE`)
    - Write `FocusTimer._tick()` decrementing remaining seconds, calling `_render()`, transitioning to `DONE` and calling `_notify()` at 0
    - Write `FocusTimer.start()`, `FocusTimer.stop()`, `FocusTimer.reset()` implementing the state machine transitions
    - Write `FocusTimer._notify()` requesting `Notification` permission and showing notification or falling back to `window.alert()`
    - Write `FocusTimer.init(containerEl)` restoring duration from Storage (default 25), rendering initial state, wiring controls
    - Disable duration input while timer is `RUNNING`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_

  - [ ]* 6.2 Write property test for timer duration range enforcement
    - **Property 3: Timer duration range enforcement**
    - For any value outside [1, 99], `_setDuration` SHALL reject it and stored duration SHALL remain unchanged; for any value in [1, 99], it SHALL be stored
    - **Validates: Requirements 3.8, 3.9, 3.10**

- [ ] 7. Implement To-Do List
  - [ ] 7.1 Implement `TodoList` CRUD and render in `app.js`
    - Write `TodoList._addTask(title)` rejecting whitespace-only strings, generating an ID via `crypto.randomUUID()` with `Date.now()` fallback, pushing to `tasks[]`, persisting, and calling `_renderList()`
    - Write `TodoList._deleteTask(id)` filtering `tasks[]`, persisting, re-rendering
    - Write `TodoList._toggleComplete(id)` flipping `completed`, persisting, re-rendering
    - Write `TodoList._editTask(id, newTitle)` rejecting empty titles, updating `title`, persisting, re-rendering
    - Write `TodoList._renderList()` performing a full DOM re-render of the task list from `tasks[]`
    - Write `TodoList.init(containerEl)` reading `pd_tasks` from Storage, wiring add-task form, calling `_renderList()` and `_initDragAndDrop()`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11_

  - [ ]* 7.2 Write property test for task addition round-trip
    - **Property 4: Task addition round-trip**
    - For any non-empty title, after `_addTask(title)`, `pd_tasks` in Storage SHALL contain an entry with that `title`
    - **Validates: Requirements 4.2, 4.11**

  - [ ]* 7.3 Write property test for empty task rejection
    - **Property 5: Empty task rejection**
    - For any whitespace-only string, `_addTask` SHALL NOT increase the length of `tasks[]`
    - **Validates: Requirements 4.3**

  - [ ]* 7.4 Write property test for task edit round-trip
    - **Property 6: Task edit round-trip**
    - For any existing task and non-empty `newTitle`, after `_editTask(id, newTitle)`, the task in Storage SHALL have `title === newTitle`
    - **Validates: Requirements 4.7**

  - [ ]* 7.5 Write property test for task deletion
    - **Property 7: Task deletion removes from storage**
    - For any existing task, after `_deleteTask(id)`, no entry in `pd_tasks` SHALL have that `id`
    - **Validates: Requirements 4.10**

- [ ] 8. Implement Task Sorting and Drag-and-Drop
  - [ ] 8.1 Implement sort functions and drag-and-drop in `app.js`
    - Write `TodoList._sortAlpha()` sorting `tasks[]` A–Z by `title`, persisting, re-rendering
    - Write `TodoList._sortByStatus()` placing incomplete tasks before completed tasks, persisting, re-rendering
    - Write `TodoList._initDragAndDrop()` wiring native HTML5 `dragstart`, `dragover`, `drop` events on list items; on `drop`, reorder `tasks[]` to match new DOM order, persist, re-render
    - Wire sort control buttons in `_renderList()` or `init()`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 8.2 Write property test for alphabetical sort
    - **Property 8: Alphabetical sort produces sorted output**
    - For any non-empty `tasks[]`, after `_sortAlpha()`, stored `title` values SHALL be in non-decreasing lexicographic order
    - **Validates: Requirements 5.3, 5.4**

  - [ ]* 8.3 Write property test for status sort invariant
    - **Property 9: Status sort invariant**
    - For any `tasks[]`, after `_sortByStatus()`, every task with `completed === false` SHALL precede every task with `completed === true` in the stored array
    - **Validates: Requirements 5.5, 5.6**

- [ ] 9. Implement Quick Links
  - [ ] 9.1 Implement `QuickLinks` module in `app.js`
    - Write `QuickLinks._validateUrl(url)` wrapping the `URL` constructor in `try/catch`, returning `true` only for `http:` or `https:` protocols
    - Write `QuickLinks._addLink(label, url)` rejecting empty labels or invalid URLs (showing inline validation messages), truncating label at 30 chars, generating ID, pushing to `links[]`, persisting, calling `_renderLinks()`
    - Write `QuickLinks._deleteLink(id)` filtering `links[]`, persisting, re-rendering
    - Write `QuickLinks._openLink(url)` calling `window.open(url, '_blank', 'noopener,noreferrer')`
    - Write `QuickLinks._renderLinks()` rendering Link cards with delete controls and click handlers
    - Write `QuickLinks.init(containerEl)` reading `pd_links` from Storage, wiring add-link form, calling `_renderLinks()`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10_

  - [ ]* 9.2 Write property test for link label truncation
    - **Property 10: Link label truncation at 30 characters**
    - For any label > 30 chars, stored `label` SHALL be exactly 30 chars; for label ≤ 30, stored `label` SHALL equal submitted value
    - **Validates: Requirements 6.9, 6.10**

  - [ ]* 9.3 Write property test for URL validation
    - **Property 11: Link URL validation**
    - For any valid `http`/`https` URL string, `_validateUrl` SHALL return `true`; for any other string, it SHALL return `false`
    - **Validates: Requirements 6.4, 6.5**

- [ ] 10. Implement `App.init()` and wire all modules
  - [ ] 10.1 Write `App.init()` in `app.js`
    - Call `Storage.init()` first
    - Call `ThemeToggle.init()` before any widget renders to prevent flash of unstyled content
    - Call `GreetingWidget.init()`, `FocusTimer.init()`, `TodoList.init()`, `QuickLinks.init()` with their respective container elements
    - Start 1-second `setInterval` calling `GreetingWidget.tick()` and `FocusTimer._tick()` (when running) on each tick
    - Register `App.init` on `DOMContentLoaded`
    - _Requirements: 8.3, 9.2, 9.3_

- [ ] 11. Checkpoint — Ensure all modules are wired and page loads correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Style all widgets
  - [ ] 12.1 Style Greeting Widget, Focus Timer, To-Do List, and Quick Links in `style.css`
    - Write widget-level styles using CSS custom properties for both themes
    - Style task items with completion indicator, edit/delete controls, and drag handle
    - Style Quick Link cards as clickable buttons with delete controls
    - Style Focus Timer controls (Start/Stop/Reset buttons) and duration input
    - Style inline validation error messages for Quick Links and task forms
    - Style the localStorage unavailability warning banner
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- The design mandates ES2020 features only — no transpilation needed; all target browsers support them natively
- Property tests validate universal correctness properties; unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation at logical milestones

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["2.2", "3.1", "4.1"] },
    { "id": 2, "tasks": ["3.2", "5.1"] },
    { "id": 3, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 4, "tasks": ["6.2", "7.1"] },
    { "id": 5, "tasks": ["7.2", "7.3", "7.4", "7.5", "8.1"] },
    { "id": 6, "tasks": ["8.2", "8.3", "9.1"] },
    { "id": 7, "tasks": ["9.2", "9.3", "10.1"] },
    { "id": 8, "tasks": ["12.1"] }
  ]
}
```
