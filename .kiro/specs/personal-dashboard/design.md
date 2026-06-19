# Design Document

## Overview

The Personal Dashboard is a single-page web application (SPA) delivered as three static files — one HTML, one CSS, and one JavaScript — with no build step, no framework, and no backend. All state lives in the browser's `localStorage`. The app is composed of five discrete widgets rendered on a single scrollable page:

- **Greeting Widget** — time, date, and a personalized contextual greeting
- **Focus Timer** — configurable Pomodoro-style countdown timer
- **To-Do List** — task manager with add/edit/delete/sort/drag-and-drop
- **Quick Links** — user-defined shortcut bookmarks
- **Theme Toggle** — light/dark mode switcher with persistence

The design prioritises zero-dependency simplicity, instant load, and correct cross-browser behaviour (Chrome, Firefox, Edge, Safari stable).

---

## Architecture

### High-Level Structure

```
personal-dashboard/
├── index.html          # Markup skeleton; loads CSS and JS
├── css/
│   └── style.css       # All styles, custom properties for theming
└── js/
    └── app.js          # All application logic (no modules needed at this scale)
```

No bundler or transpiler. ES2020 features (optional chaining, nullish coalescing, `const`/`let`, arrow functions, template literals) are used directly — all target browsers support them natively in their current stable versions.

### Execution Model

```
Page Load
    │
    ├─ 1. Read theme preference from localStorage → apply CSS class on <html>
    │       (prevents flash of unstyled content)
    │
    ├─ 2. Read all persisted data from localStorage
    │
    ├─ 3. Render all widgets with restored state
    │
    └─ 4. Start clock interval (1 s tick)
```

All mutations follow a **read → mutate → persist → re-render** cycle. There is no virtual DOM or reactive framework; DOM updates are performed directly by small, focused render functions.

### Module Boundaries (within `app.js`)

Even though the code lives in a single file, it is organised into clearly named sections with clear boundaries:

| Section | Responsibility |
|---|---|
| `Storage` | All `localStorage` reads and writes |
| `GreetingWidget` | Time/date display, name editing |
| `FocusTimer` | Timer state, countdown, notifications |
| `TodoList` | Task CRUD, drag-and-drop, sort |
| `QuickLinks` | Link CRUD, URL validation |
| `ThemeToggle` | Theme application and persistence |
| `App.init()` | Bootstraps all widgets on `DOMContentLoaded` |

---

## Components and Interfaces

### Storage Module

Thin wrapper around `localStorage` with a fallback detection mechanism.

```js
const Storage = {
  available: false,           // set during init
  init() { /* detect availability, set flag, warn user if unavailable */ },
  get(key, fallback),         // returns parsed JSON or fallback
  set(key, value),            // serialises to JSON, writes
  remove(key),                // removes key
};
```

**Keys used:**

| Key | Type | Description |
|---|---|---|
| `pd_theme` | `"light" \| "dark"` | Selected theme |
| `pd_name` | `string` | User's custom name (max 50 chars) |
| `pd_timer_duration` | `number` | Timer duration in minutes (1–99) |
| `pd_tasks` | `Task[]` | Array of task objects |
| `pd_links` | `Link[]` | Array of link objects |

---

### Greeting Widget

Responsibilities: render clock (every 1 s), render date, derive and render greeting string, handle inline name editing.

**Interface:**

```js
const GreetingWidget = {
  init(containerEl),          // wires up DOM references, renders initial state
  tick(),                     // called by the 1-second interval; updates time display
  _getGreeting(hour),         // pure function: number → greeting string
  _renderName(),              // reads name from Storage, updates DOM
  _saveName(rawInput),        // trims, truncates at 50 chars, persists, re-renders
};
```

**Greeting mapping:**

| Hour range | Greeting |
|---|---|
| 05–11 | Good Morning |
| 12–17 | Good Afternoon |
| 18–21 | Good Evening |
| 22–04 | Good Night |

The clock uses `Date` object created inside `tick()` on every interval fire to avoid drift.

---

### Focus Timer

Responsibilities: countdown state machine, UI controls (Start / Stop / Reset), duration configuration, completion notification.

**State machine:**

```
IDLE ──start──► RUNNING ──stop──► PAUSED
  ▲                │                  │
  │               00:00             start
  │                │                  │
  └──reset────── DONE ◄──────────────┘
```

**Interface:**

```js
const FocusTimer = {
  init(containerEl),
  start(),
  stop(),
  reset(),
  _tick(),                    // called every second while RUNNING
  _setDuration(minutes),      // validates 1–99, persists, resets
  _notify(),                  // browser Notification API or fallback alert
  _render(),                  // updates MM:SS display and button states
};
```

- While `RUNNING`, the duration input is `disabled` (Requirement 3.11).
- `_notify()` requests `Notification` permission on first use; falls back to `window.alert` if denied.
- The interval handle is stored as `this._intervalId` and cleared on stop/reset/done.

---

### To-Do List

Responsibilities: task CRUD, completion toggle, drag-and-drop reorder, alphabetical sort, status sort.

**Interface:**

```js
const TodoList = {
  init(containerEl),
  _addTask(title),            // validates non-empty, creates Task, persists, re-renders
  _deleteTask(id),
  _toggleComplete(id),
  _editTask(id, newTitle),    // validates non-empty, persists, re-renders
  _sortAlpha(),               // sorts tasks[] A–Z, persists, re-renders
  _sortByStatus(),            // incomplete first, then complete, persists, re-renders
  _renderList(),              // full list re-render from tasks[]
  _initDragAndDrop(),         // wires HTML5 drag events on list items
};
```

**Drag-and-Drop strategy:** HTML5 native `dragstart` / `dragover` / `drop` events. On `drop`, the internal `tasks` array is reordered to match the new DOM order, then persisted. This avoids any third-party library.

---

### Quick Links

Responsibilities: display links as cards, add (with validation), delete, open in new tab.

**Interface:**

```js
const QuickLinks = {
  init(containerEl),
  _addLink(label, url),       // validates label non-empty, URL valid, truncates label at 30 chars
  _deleteLink(id),
  _openLink(url),             // window.open(url, '_blank', 'noopener,noreferrer')
  _validateUrl(url),          // returns boolean; uses URL constructor
  _renderLinks(),
};
```

URL validation uses the native `URL` constructor inside a `try/catch`; a URL is valid if it parses without throwing and its protocol is `http:` or `https:`.

---

### Theme Toggle

Responsibilities: apply theme class to `<html>`, persist preference, initialise before first render.

```js
const ThemeToggle = {
  init(buttonEl),
  _applyTheme(theme),         // adds/removes 'dark' class on document.documentElement
  _toggle(),
};
```

Theming is done exclusively via a `dark` CSS class on `<html>`. All component colours are CSS custom properties (`--color-bg`, `--color-text`, etc.) defined in `:root` (light) and `html.dark` (dark) selectors.

---

## Data Models

### Task

```ts
interface Task {
  id: string;           // crypto.randomUUID() or Date.now().toString() fallback
  title: string;        // 1+ non-whitespace characters
  completed: boolean;
  createdAt: number;    // Unix timestamp (ms), used for stable ordering tie-breaking
}
```

### Link

```ts
interface Link {
  id: string;           // same ID generation as Task
  label: string;        // 1–30 characters (truncated on save)
  url: string;          // validated http/https URL
}
```

### Storage Schema

```ts
interface LocalStorageSchema {
  pd_theme: "light" | "dark";
  pd_name: string;              // max 50 chars
  pd_timer_duration: number;    // 1–99
  pd_tasks: Task[];
  pd_links: Link[];
}
```

All arrays default to `[]` when the key is absent. Numeric values default to `25` (timer) or appropriate sentinels. The `Storage.get(key, fallback)` pattern handles all missing-key cases.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Greeting text matches hour

*For any* integer hour in the range 0–23, `_getGreeting(hour)` SHALL return exactly one of "Good Morning", "Good Afternoon", "Good Evening", or "Good Night", and each hour SHALL map to exactly one greeting consistent with the ranges defined in Requirements 1.3–1.6.

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

---

### Property 2: Name truncation at 50 characters

*For any* input string of length > 50, `_saveName` SHALL store a value in `localStorage` whose length is exactly 50. *For any* input string of length ≤ 50, `_saveName` SHALL store the string unchanged (after trimming).

**Validates: Requirements 2.5, 2.6**

---

### Property 3: Timer duration range enforcement

*For any* numeric value outside the range [1, 99], `_setDuration` SHALL reject the value and the stored duration SHALL remain unchanged. *For any* value inside the range [1, 99], `_setDuration` SHALL store that value.

**Validates: Requirements 3.8, 3.9, 3.10**

---

### Property 4: Task addition round-trip

*For any* non-empty task title string, after calling `_addTask(title)`, reading the `pd_tasks` key from `localStorage` SHALL yield an array that contains an entry with the same `title`.

**Validates: Requirements 4.2, 4.11**

---

### Property 5: Empty task rejection

*For any* string composed entirely of whitespace (including the empty string), `_addTask` SHALL not increase the length of the tasks array.

**Validates: Requirements 4.3**

---

### Property 6: Task edit round-trip

*For any* existing task and any non-empty new title, after calling `_editTask(id, newTitle)`, the task in `localStorage` with that `id` SHALL have `title === newTitle`.

**Validates: Requirements 4.7**

---

### Property 7: Task deletion removes from storage

*For any* existing task, after calling `_deleteTask(id)`, no entry in the `pd_tasks` array in `localStorage` SHALL have that `id`.

**Validates: Requirements 4.10**

---

### Property 8: Alphabetical sort produces sorted output

*For any* non-empty tasks array, after calling `_sortAlpha()`, the `title` values in `localStorage` SHALL be in non-decreasing lexicographic order.

**Validates: Requirements 5.3, 5.4**

---

### Property 9: Status sort invariant

*For any* tasks array, after calling `_sortByStatus()`, every incomplete task (`completed === false`) SHALL precede every completed task (`completed === true`) in the stored array.

**Validates: Requirements 5.5, 5.6**

---

### Property 10: Link label truncation at 30 characters

*For any* label string of length > 30 submitted to `_addLink`, the stored `label` field SHALL be exactly 30 characters. *For any* label of length ≤ 30, the stored `label` SHALL equal the submitted value.

**Validates: Requirements 6.9, 6.10**

---

### Property 11: Link URL validation

*For any* URL string that the native `URL` constructor accepts with protocol `http:` or `https:`, `_validateUrl` SHALL return `true`. *For any* string that does not parse as a valid `http`/`https` URL, `_validateUrl` SHALL return `false`.

**Validates: Requirements 6.4, 6.5**

---

### Property 12: Theme persistence round-trip

*For any* theme value (`"light"` or `"dark"`), after calling `_applyTheme(theme)`, reading `pd_theme` from `localStorage` SHALL return the same theme value.

**Validates: Requirements 7.3, 7.4**

---

### Property 13: Storage serialisation round-trip

*For any* valid `Task[]` or `Link[]` array, calling `Storage.set(key, value)` followed by `Storage.get(key, [])` SHALL return a deep-equal array.

**Validates: Requirements 8.2, 8.3**

---

## Error Handling

### localStorage Unavailability (Requirement 8.4)

`Storage.init()` runs a write/read/delete probe inside a `try/catch`. If it throws (private browsing mode with storage quota zero, or browser policy), `Storage.available` is set to `false` and a non-blocking warning banner is inserted into the DOM. All subsequent `Storage.set()` calls are no-ops when `available === false`; the app continues to function in-session without persistence.

### Notification Permission Denied

`FocusTimer._notify()` calls `Notification.requestPermission()`. If the result is `"denied"` or the API is absent, the fallback is a `window.alert()`. The timer still completes normally.

### Invalid Stored Data

On load, if `JSON.parse` of any `localStorage` value throws, `Storage.get` returns the provided `fallback`. This handles corrupted or manually edited storage gracefully.

### URL Validation

`_validateUrl` wraps the `URL` constructor in `try/catch`. Non-URL strings, relative paths, and `javascript:` / `data:` URLs all return `false`, preventing unsafe link injection.

### Form Input Constraints

All user inputs are validated on the JavaScript side (not relying solely on HTML attributes) to ensure consistent cross-browser behaviour. Validation errors are shown as inline messages adjacent to the relevant control, not via `alert()`.

---

## Testing Strategy

### Unit Tests

Focus on pure functions and logic units. No framework is mandated; the functions are plain JavaScript and can be tested with any runner (e.g., Vitest or Jest with jsdom).

**Key units to test:**

- `GreetingWidget._getGreeting(hour)` — all 24 hour values
- `Storage.get` / `Storage.set` / `Storage.remove` — with a mock `localStorage`
- `FocusTimer._setDuration` — boundary values (0, 1, 50, 99, 100)
- `TodoList._addTask` / `_editTask` / `_sortAlpha` / `_sortByStatus`
- `QuickLinks._validateUrl` — valid and invalid URL strings
- Name truncation logic (50-char boundary)
- Label truncation logic (30-char boundary)

### Property-Based Tests

Property-based testing (PBT) is appropriate here because the feature contains pure functions with large, typed input spaces where universal properties hold — particularly for sorting, validation, truncation, and serialisation. Use **fast-check** (a well-maintained JavaScript PBT library).

Each property test must run a minimum of **100 iterations**.

Tag format for each test:
`// Feature: personal-dashboard, Property N: <property_text>`

**Properties to implement:**

| Design Property | Test description |
|---|---|
| Property 1 | Generate all integers 0–23; assert correct greeting string |
| Property 2 | Generate strings of arbitrary length; assert stored length ≤ 50 |
| Property 3 | Generate numbers outside [1,99] and inside [1,99]; assert accept/reject |
| Property 4 | Generate non-empty strings; add task; assert round-trip from localStorage |
| Property 5 | Generate whitespace-only strings; assert task count unchanged |
| Property 6 | Generate task + non-empty title; edit; assert localStorage reflects change |
| Property 7 | Generate task; delete; assert id absent from localStorage |
| Property 8 | Generate task arrays; sort alpha; assert lexicographic order |
| Property 9 | Generate task arrays; sort by status; assert all incomplete before complete |
| Property 10 | Generate label strings of arbitrary length; assert stored length ≤ 30 |
| Property 11 | Generate URL strings; assert validator agrees with URL constructor |
| Property 12 | Generate theme values; apply; assert persistence round-trip |
| Property 13 | Generate Task[] and Link[] arrays; set then get; assert deep equality |

### Integration / Smoke Tests

- Page load with empty localStorage: all widgets render default state within 500 ms
- Page load with pre-populated localStorage: all widgets restore correctly
- Theme toggle: dark class applied before first paint (no FOSC)
- Timer runs to 00:00 and triggers notification/alert

### Accessibility

- All interactive controls have `aria-label` or associated `<label>` elements
- Keyboard-operable: all actions reachable without a mouse
- Colour contrast verified against WCAG 2.1 AA (4.5:1 for normal text)
- Note: full WCAG validation requires manual testing with assistive technologies and expert accessibility review.
