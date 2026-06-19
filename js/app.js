// =============================================================
// Personal Dashboard — app.js
// All application logic lives here, organized into module
// objects: Storage, GreetingWidget, FocusTimer, TodoList,
// QuickLinks, ThemeToggle, and App (bootstrap).
// No external dependencies — ES2020 Vanilla JS only.
// =============================================================

// =============================================================
// Storage Module
// Thin wrapper around localStorage with availability detection.
// Keys: pd_theme, pd_name, pd_timer_duration, pd_tasks, pd_links
// Req 8.1, 8.2, 8.3, 8.4
// =============================================================
const Storage = {
  available: false,

  /**
   * Probes localStorage with a write/read/delete cycle to confirm
   * it is accessible. Sets Storage.available accordingly and, if
   * unavailable, inserts a non-blocking warning banner into the DOM.
   */
  init() {
    const PROBE_KEY = '__pd_storage_probe__';
    try {
      localStorage.setItem(PROBE_KEY, '1');
      const val = localStorage.getItem(PROBE_KEY);
      localStorage.removeItem(PROBE_KEY);
      // If the write succeeded but read returned null, storage is broken.
      if (val !== '1') {
        throw new Error('Storage probe read mismatch');
      }
      this.available = true;
    } catch (e) {
      this.available = false;
      // Insert a warning banner into the DOM (Req 8.4).
      // Defer to ensure document.body is available when called from a
      // DOMContentLoaded handler, but guard for direct invocation.
      const insertBanner = () => {
        if (document.getElementById('storage-warning')) return; // already present
        const banner = document.createElement('div');
        banner.id = 'storage-warning';
        banner.setAttribute('role', 'alert');
        banner.setAttribute('aria-live', 'assertive');
        banner.style.cssText = [
          'position:fixed',
          'top:0',
          'left:0',
          'right:0',
          'z-index:9999',
          'background:#b91c1c',
          'color:#fff',
          'text-align:center',
          'padding:0.6rem 1rem',
          'font-size:0.95rem',
          'font-family:inherit',
        ].join(';');
        banner.textContent =
          'Warning: localStorage is unavailable. Your data will not be saved.';
        document.body.insertBefore(banner, document.body.firstChild);
      };

      if (document.body) {
        insertBanner();
      } else {
        document.addEventListener('DOMContentLoaded', insertBanner);
      }
    }
  },

  /**
   * Returns the parsed JSON value stored under `key`, or `fallback`
   * if the key does not exist or the stored value cannot be parsed.
   * @param {string} key
   * @param {*} fallback
   * @returns {*}
   */
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },

  /**
   * Serialises `value` to JSON and writes it under `key`.
   * No-op when Storage.available === false so the app degrades
   * gracefully in restricted environments (Req 8.4).
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    if (!this.available) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // Quota exceeded or other write error — fail silently.
    }
  },

  /**
   * Removes the entry stored under `key` from localStorage.
   * @param {string} key
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // Fail silently if storage is inaccessible.
    }
  },
};

// =============================================================
// ThemeToggle Module
// Applies and persists the light/dark theme preference.
// Theming is done exclusively via a 'dark' CSS class on <html>.
// Storage key: pd_theme — "light" | "dark"
// Req 7.1, 7.2, 7.3, 7.4, 7.5
// =============================================================
const ThemeToggle = {
  /**
   * Applies the given theme by adding/removing the 'dark' class on
   * <html>, then persists the choice to localStorage.
   * @param {"light"|"dark"} theme
   */
  _applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    Storage.set('pd_theme', theme);
  },

  /**
   * Reads the currently active theme from the <html> class list and
   * calls _applyTheme with the opposite value.
   */
  _toggle() {
    const isDark = document.documentElement.classList.contains('dark');
    this._applyTheme(isDark ? 'light' : 'dark');
  },

  /**
   * Reads the saved theme from localStorage (defaulting to "light"),
   * applies it immediately to prevent a flash of unstyled content,
   * and wires the click event on the toggle button.
   * @param {HTMLElement} buttonEl
   */
  init(buttonEl) {
    // Req 7.4 / 7.5 — apply saved theme (or default "light") before first paint.
    const savedTheme = Storage.get('pd_theme', 'light');
    this._applyTheme(savedTheme);

    // Req 7.1 / 7.2 — wire up the toggle button.
    if (buttonEl) {
      buttonEl.addEventListener('click', () => this._toggle());
    }
  },
};

// =============================================================
// GreetingWidget Module
// Displays the current time (HH:MM), date (human-readable), and
// a contextual greeting with an optional personalised name.
// The name is stored in localStorage under the key pd_name.
// Req 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1–2.6
// =============================================================
const GreetingWidget = {
  // Private DOM references — set during init()
  _timeEl: null,
  _dateEl: null,
  _messageEl: null,
  _nameInput: null,
  _saveBtn: null,
  _clearBtn: null,

  /**
   * Pure function: maps an integer hour (0–23) to one of four
   * greeting strings according to the ranges in Requirements 1.3–1.6.
   * @param {number} hour — integer 0–23
   * @returns {"Good Morning"|"Good Afternoon"|"Good Evening"|"Good Night"}
   */
  _getGreeting(hour) {
    if (hour >= 5 && hour <= 11) return 'Good Morning';
    if (hour >= 12 && hour <= 17) return 'Good Afternoon';
    if (hour >= 18 && hour <= 21) return 'Good Evening';
    return 'Good Night'; // 22–23 and 0–4
  },

  /**
   * Reads pd_name from Storage, builds the full greeting string
   * (greeting + optional ", <name>" suffix), and writes it to
   * the message element. Called from tick() and after name changes.
   * Req 1.7, 2.3, 2.4
   */
  _renderName() {
    if (!this._messageEl) return;
    const now = new Date();
    const hour = now.getHours();
    const base = this._getGreeting(hour);
    const name = Storage.get('pd_name', '');
    this._messageEl.textContent = name ? `${base}, ${name}` : base;
  },

  /**
   * Trims rawInput, truncates to 50 characters, persists to Storage,
   * and refreshes the greeting display. An empty trimmed value removes
   * the stored name so the greeting appears without a suffix.
   * Req 2.2, 2.4, 2.5, 2.6
   * @param {string} rawInput
   */
  _saveName(rawInput) {
    const trimmed = rawInput.trim();
    if (trimmed === '') {
      // Empty submission clears the stored name (Req 2.4)
      Storage.remove('pd_name');
    } else {
      // Truncate at 50 characters (Req 2.5, 2.6)
      const name = trimmed.slice(0, 50);
      Storage.set('pd_name', name);
    }
    this._renderName();
  },

  /**
   * Called every second by the app interval.
   * Creates a fresh Date to avoid drift (Req 1.1), updates the time
   * display (HH:MM, zero-padded), the human-readable date (Req 1.2),
   * and the greeting text (Req 1.3–1.7).
   */
  tick() {
    const now = new Date();

    // --- Time: HH:MM, zero-padded (Req 1.1) ---
    if (this._timeEl) {
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      this._timeEl.textContent = `${hh}:${mm}`;
      // Keep aria-label current for screen readers
      this._timeEl.setAttribute('aria-label', `Current time: ${hh}:${mm}`);
    }

    // --- Date: human-readable (Req 1.2) ---
    if (this._dateEl) {
      const dateStr = now.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      this._dateEl.textContent = dateStr;
      this._dateEl.setAttribute('aria-label', `Current date: ${dateStr}`);
    }

    // --- Greeting + name (Req 1.3–1.7) ---
    this._renderName();
  },

  /**
   * Wires up the inline-edit name row (input, Save button, Clear button
   * and keyboard shortcuts), calls _renderName() and tick() to paint
   * the initial state immediately.
   * Req 2.1
   * @param {HTMLElement} containerEl — the #greeting section element
   */
  init(containerEl) {
    // Scope all DOM queries to the widget container where possible
    this._timeEl    = containerEl.querySelector('#greeting-time');
    this._dateEl    = containerEl.querySelector('#greeting-date');
    this._messageEl = containerEl.querySelector('#greeting-message');
    this._nameInput = containerEl.querySelector('#greeting-name-input');
    this._saveBtn   = containerEl.querySelector('#greeting-name-save');
    this._clearBtn  = containerEl.querySelector('#greeting-name-clear');

    // Pre-fill the input with any saved name (Req 2.3)
    const savedName = Storage.get('pd_name', '');
    if (this._nameInput && savedName) {
      this._nameInput.value = savedName;
    }

    // Save on button click
    if (this._saveBtn && this._nameInput) {
      this._saveBtn.addEventListener('click', () => {
        this._saveName(this._nameInput.value);
      });
    }

    // Save on Enter key inside the input
    if (this._nameInput) {
      this._nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this._saveName(this._nameInput.value);
        }
      });

      // Auto-save on blur (inline-edit UX convenience)
      this._nameInput.addEventListener('blur', () => {
        this._saveName(this._nameInput.value);
      });
    }

    // Clear button removes the saved name and empties the input (Req 2.4)
    if (this._clearBtn && this._nameInput) {
      this._clearBtn.addEventListener('click', () => {
        this._nameInput.value = '';
        this._saveName('');
      });
    }

    // Render immediately — no blank flash on page load
    this._renderName();
    this.tick();
  },
};

// =============================================================
// FocusTimer Module
// Pomodoro-style countdown timer with four states:
//   IDLE → RUNNING → PAUSED → DONE → (reset) → IDLE
// Duration is stored in localStorage under pd_timer_duration.
// The 1-second interval is managed by App.init(); FocusTimer
// only handles state transitions and rendering.
// Req 3.1–3.11
// =============================================================
const FocusTimer = {
  // State constants
  STATE_IDLE:    'IDLE',
  STATE_RUNNING: 'RUNNING',
  STATE_PAUSED:  'PAUSED',
  STATE_DONE:    'DONE',

  // Internal state
  _state:          'IDLE',   // current timer state
  _durationMins:   25,       // configured duration in minutes
  _remainingSecs:  0,        // remaining seconds in current session
  _intervalId:     null,     // setInterval handle (managed by App.init)

  // DOM references — set during init()
  _displayEl:      null,
  _durationInput:  null,
  _startBtn:       null,
  _stopBtn:        null,
  _resetBtn:       null,

  // -----------------------------------------------------------------
  // _setDuration(minutes)
  // Validates the range [1, 99], persists to pd_timer_duration,
  // and resets the remaining time to reflect the new duration.
  // Invalid values are silently rejected (stored duration unchanged).
  // Req 3.8, 3.9, 3.10
  // -----------------------------------------------------------------
  _setDuration(minutes) {
    const mins = Number(minutes);
    // Reject anything outside the valid range [1, 99] (Req 3.10)
    if (!Number.isFinite(mins) || mins < 1 || mins > 99) return;
    this._durationMins  = mins;
    this._remainingSecs = mins * 60;
    Storage.set('pd_timer_duration', mins);
    // Sync the input field to the validated value
    if (this._durationInput) {
      this._durationInput.value = mins;
    }
    this._render();
  },

  // -----------------------------------------------------------------
  // _render()
  // Updates the MM:SS display and adjusts button enabled/disabled
  // states based on the current timer state.
  // Req 3.3, 3.11
  // -----------------------------------------------------------------
  _render() {
    // -- MM:SS display (Req 3.3) --
    if (this._displayEl) {
      const totalSecs = this._remainingSecs;
      const mm = String(Math.floor(totalSecs / 60)).padStart(2, '0');
      const ss = String(totalSecs % 60).padStart(2, '0');
      const formatted = `${mm}:${ss}`;
      this._displayEl.textContent = formatted;
      this._displayEl.setAttribute('aria-label', `Timer countdown: ${formatted}`);
    }

    // -- Control states per current state --
    const isRunning = this._state === this.STATE_RUNNING;
    const isIdle    = this._state === this.STATE_IDLE;
    const isPaused  = this._state === this.STATE_PAUSED;
    const isDone    = this._state === this.STATE_DONE;

    if (this._startBtn) {
      // Start enabled in IDLE or PAUSED; disabled otherwise
      this._startBtn.disabled = isRunning || isDone;
    }
    if (this._stopBtn) {
      // Stop (pause) enabled only while RUNNING
      this._stopBtn.disabled = !isRunning;
    }
    if (this._resetBtn) {
      // Reset always available except when already IDLE with full time
      this._resetBtn.disabled = false;
    }

    // Duration input disabled while RUNNING (Req 3.11)
    if (this._durationInput) {
      this._durationInput.disabled = isRunning;
    }
  },

  // -----------------------------------------------------------------
  // _tick()
  // Called every second by the App interval while state is RUNNING.
  // Decrements remaining seconds, re-renders, and transitions to DONE
  // when the countdown reaches zero.
  // Req 3.4, 3.7
  // -----------------------------------------------------------------
  _tick() {
    if (this._state !== this.STATE_RUNNING) return;

    if (this._remainingSecs > 0) {
      this._remainingSecs--;
      this._render();
    }

    // Transition to DONE when countdown hits zero (Req 3.7)
    if (this._remainingSecs === 0) {
      this._state = this.STATE_DONE;
      this._render();
      this._notify();
    }
  },

  // -----------------------------------------------------------------
  // start()
  // Transitions IDLE → RUNNING or PAUSED → RUNNING.
  // If starting from IDLE, resets remaining time to the full duration.
  // Req 3.4
  // -----------------------------------------------------------------
  start() {
    if (this._state === this.STATE_IDLE) {
      // Ensure remaining is initialised to full duration
      this._remainingSecs = this._durationMins * 60;
      this._state = this.STATE_RUNNING;
    } else if (this._state === this.STATE_PAUSED) {
      // Resume from where we left off
      this._state = this.STATE_RUNNING;
    }
    // Ignore start() calls in RUNNING or DONE states
    this._render();
  },

  // -----------------------------------------------------------------
  // stop()
  // Transitions RUNNING → PAUSED, retaining remaining time.
  // Req 3.5
  // -----------------------------------------------------------------
  stop() {
    if (this._state === this.STATE_RUNNING) {
      this._state = this.STATE_PAUSED;
      this._render();
    }
  },

  // -----------------------------------------------------------------
  // reset()
  // From any state: restores remaining time to the current configured
  // duration and transitions back to IDLE.
  // Req 3.6
  // -----------------------------------------------------------------
  reset() {
    this._state = this.STATE_IDLE;
    this._remainingSecs = this._durationMins * 60;
    this._render();
  },

  // -----------------------------------------------------------------
  // _notify()
  // Requests Notification permission if not already granted and shows
  // a browser notification. Falls back to window.alert() if the API
  // is absent or permission is denied.
  // Req 3.7
  // -----------------------------------------------------------------
  _notify() {
    const fallback = () => {
      window.alert('Focus session complete! Great work.');
    };

    // Check if the Notification API is available
    if (!('Notification' in window)) {
      fallback();
      return;
    }

    if (Notification.permission === 'granted') {
      try {
        new Notification('Focus Timer', {
          body: 'Your focus session is complete! Great work.',
          icon: '',
        });
      } catch (e) {
        fallback();
      }
    } else if (Notification.permission !== 'denied') {
      // Request permission; show notification if granted, alert otherwise
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          try {
            new Notification('Focus Timer', {
              body: 'Your focus session is complete! Great work.',
              icon: '',
            });
          } catch (e) {
            fallback();
          }
        } else {
          fallback();
        }
      });
    } else {
      // Permission previously denied — use fallback
      fallback();
    }
  },

  // -----------------------------------------------------------------
  // init(containerEl)
  // Restores duration from Storage (defaulting to 25 min), sets up
  // initial state (IDLE), renders the display, and wires all controls.
  // Req 3.1, 3.2, 3.8
  // -----------------------------------------------------------------
  init(containerEl) {
    // Grab DOM references scoped to the widget container
    this._displayEl     = containerEl.querySelector('#timer-display');
    this._durationInput = containerEl.querySelector('#timer-duration-input');
    this._startBtn      = containerEl.querySelector('#timer-start');
    this._stopBtn       = containerEl.querySelector('#timer-stop');
    this._resetBtn      = containerEl.querySelector('#timer-reset');

    // Restore saved duration from localStorage, defaulting to 25 (Req 3.1, 3.2)
    const savedDuration = Storage.get('pd_timer_duration', 25);
    this._durationMins  = (Number.isFinite(Number(savedDuration)) &&
                           savedDuration >= 1 && savedDuration <= 99)
                          ? Number(savedDuration)
                          : 25;
    this._remainingSecs = this._durationMins * 60;
    this._state         = this.STATE_IDLE;

    // Sync the duration input to the restored value
    if (this._durationInput) {
      this._durationInput.value = this._durationMins;
    }

    // Wire duration input — validate and apply on change/blur (Req 3.8, 3.9, 3.10)
    if (this._durationInput) {
      const applyDuration = () => {
        // _setDuration handles validation; invalid values are rejected
        this._setDuration(this._durationInput.value);
      };
      this._durationInput.addEventListener('change', applyDuration);
      this._durationInput.addEventListener('blur',   applyDuration);
    }

    // Wire Start button (Req 3.4)
    if (this._startBtn) {
      this._startBtn.addEventListener('click', () => this.start());
    }

    // Wire Stop/Pause button (Req 3.5)
    if (this._stopBtn) {
      this._stopBtn.addEventListener('click', () => this.stop());
    }

    // Wire Reset button (Req 3.6)
    if (this._resetBtn) {
      this._resetBtn.addEventListener('click', () => this.reset());
    }

    // Render initial state so the display and button states are correct
    this._render();
  },
};

// =============================================================
// TodoList Module
// Task CRUD, completion toggle, drag-and-drop reorder, and sort.
// Tasks are stored in localStorage under the key pd_tasks.
// Req 4.1–4.11, 5.1–5.6
// =============================================================
const TodoList = {
  // Internal state
  tasks: [],

  // DOM references — set during init()
  _listEl: null,
  _form:   null,
  _input:  null,

  // -----------------------------------------------------------------
  // _addTask(title)
  // Rejects whitespace-only or empty strings. Creates a new Task
  // object, appends it to this.tasks, persists, and re-renders.
  // Req 4.1, 4.2, 4.3
  // -----------------------------------------------------------------
  _addTask(title) {
    if (typeof title !== 'string' || title.trim() === '') return;

    // Generate a unique ID — prefer crypto.randomUUID(), fall back to Date.now()
    const id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : Date.now().toString();

    /** @type {{ id: string, title: string, completed: boolean, createdAt: number }} */
    const task = {
      id,
      title: title.trim(),
      completed: false,
      createdAt: Date.now(),
    };

    this.tasks.push(task);
    Storage.set('pd_tasks', this.tasks);
    this._renderList();
  },

  // -----------------------------------------------------------------
  // _deleteTask(id)
  // Removes the task with the given id from this.tasks, persists,
  // and re-renders the list.
  // Req 4.9, 4.10
  // -----------------------------------------------------------------
  _deleteTask(id) {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    Storage.set('pd_tasks', this.tasks);
    this._renderList();
  },

  // -----------------------------------------------------------------
  // _toggleComplete(id)
  // Flips the completed boolean on the task with the given id,
  // persists, and re-renders.
  // Req 4.5
  // -----------------------------------------------------------------
  _toggleComplete(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    Storage.set('pd_tasks', this.tasks);
    this._renderList();
  },

  // -----------------------------------------------------------------
  // _editTask(id, newTitle)
  // Rejects empty/whitespace-only newTitle. Updates the title of the
  // task with the given id to newTitle.trim(), persists, re-renders.
  // Req 4.6, 4.7, 4.8
  // -----------------------------------------------------------------
  _editTask(id, newTitle) {
    if (typeof newTitle !== 'string' || newTitle.trim() === '') return;
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return;
    task.title = newTitle.trim();
    Storage.set('pd_tasks', this.tasks);
    this._renderList();
  },

  // -----------------------------------------------------------------
  // _renderList()
  // Full DOM re-render of #todo-items from this.tasks[].
  // Each task gets a checkbox, title span, edit button, and delete
  // button inside a draggable <li>.
  // Req 4.4, 4.5, 4.6, 4.9
  // -----------------------------------------------------------------
  _renderList() {
    if (!this._listEl) return;

    // Clear the list before re-rendering
    this._listEl.innerHTML = '';

    if (this.tasks.length === 0) {
      const placeholder = document.createElement('li');
      placeholder.className = 'todo-empty-placeholder';
      placeholder.setAttribute('aria-live', 'polite');
      placeholder.textContent = 'No tasks yet. Add one above!';
      this._listEl.appendChild(placeholder);
      return;
    }

    this.tasks.forEach((task) => {
      const li = document.createElement('li');
      li.className = 'todo-item';
      li.setAttribute('draggable', 'true');
      li.setAttribute('data-id', task.id);

      // --- Checkbox (completion toggle) ---
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.setAttribute('aria-label', 'Mark complete');
      checkbox.addEventListener('change', () => {
        this._toggleComplete(task.id);
      });

      // --- Title span ---
      const titleSpan = document.createElement('span');
      titleSpan.className = 'todo-title' + (task.completed ? ' todo-title--completed' : '');
      titleSpan.textContent = task.title;

      // --- Edit button ---
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'todo-edit-btn';
      editBtn.setAttribute('aria-label', 'Edit task');
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => {
        this._enterEditMode(li, task, titleSpan, editBtn);
      });

      // --- Delete button ---
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'todo-delete-btn';
      deleteBtn.setAttribute('aria-label', 'Delete task');
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => {
        this._deleteTask(task.id);
      });

      li.appendChild(checkbox);
      li.appendChild(titleSpan);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      this._listEl.appendChild(li);
    });
  },

  // -----------------------------------------------------------------
  // _enterEditMode(li, task, titleSpan, editBtn)
  // Replaces the title span with an inline input pre-filled with the
  // current title. Confirms on Enter or blur, cancels on Escape.
  // -----------------------------------------------------------------
  _enterEditMode(li, task, titleSpan, editBtn) {
    // Prevent multiple edit inputs from appearing simultaneously
    if (li.querySelector('.todo-edit-input')) return;

    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'todo-edit-input';
    editInput.value = task.title;
    editInput.setAttribute('aria-label', 'Edit task title');

    // Hide the span and edit button while editing
    titleSpan.style.display = 'none';
    editBtn.style.display = 'none';

    const confirm = () => {
      const newTitle = editInput.value;
      if (newTitle.trim() !== '') {
        this._editTask(task.id, newTitle);
        // _renderList() will rebuild the DOM; no need to revert manually
      } else {
        // Rejected — restore original view without re-rendering
        titleSpan.style.display = '';
        editBtn.style.display = '';
        li.removeChild(editInput);
      }
    };

    const cancel = () => {
      titleSpan.style.display = '';
      editBtn.style.display = '';
      if (editInput.parentNode === li) {
        li.removeChild(editInput);
      }
    };

    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirm();
      } else if (e.key === 'Escape') {
        cancel();
      }
    });

    editInput.addEventListener('blur', () => {
      // Small timeout lets the keydown handler fire first
      setTimeout(() => {
        if (editInput.parentNode === li) {
          confirm();
        }
      }, 100);
    });

    // Insert inline input right after the title span
    li.insertBefore(editInput, titleSpan.nextSibling);
    editInput.focus();
    editInput.select();
  },

  // -----------------------------------------------------------------
  // _sortAlpha()
  // Sorts tasks A–Z by title using a locale-aware stable comparison,
  // persists the new order to localStorage, and re-renders the list.
  // Req 5.3, 5.4
  // -----------------------------------------------------------------
  _sortAlpha() {
    // localeCompare provides locale-aware, stable alphabetical ordering.
    this.tasks.sort((a, b) => a.title.localeCompare(b.title));
    Storage.set('pd_tasks', this.tasks);
    this._renderList();
  },

  // -----------------------------------------------------------------
  // _sortByStatus()
  // Groups incomplete tasks before completed tasks. Tasks within the
  // same completion group retain their relative order (stable sort).
  // Persists the new order and re-renders.
  // Req 5.5, 5.6
  // -----------------------------------------------------------------
  _sortByStatus() {
    // A stable sort: incomplete (false) sorts before complete (true).
    // Equal completion values produce 0 so relative order is preserved.
    this.tasks.sort((a, b) => {
      if (a.completed === b.completed) return 0;
      return a.completed ? 1 : -1; // false (incomplete) < true (complete)
    });
    Storage.set('pd_tasks', this.tasks);
    this._renderList();
  },

  // -----------------------------------------------------------------
  // _initDragAndDrop()
  // Wires HTML5 native drag-and-drop on the list container using event
  // delegation so handlers survive _renderList() re-builds.
  //
  // Strategy (Req 5.1, 5.2):
  //   dragstart  — tag the dragged <li> with its task id via dataTransfer
  //   dragover   — prevent default to allow a drop; apply visual indicator
  //   dragleave  — remove visual indicator when pointer leaves a target
  //   dragend    — clean up any lingering visual indicator
  //   drop       — read new DOM order, rebuild this.tasks[], persist, re-render
  // -----------------------------------------------------------------
  _initDragAndDrop() {
    if (!this._listEl) return;

    // dragstart — mark the source item so the drop handler knows what moved
    this._listEl.addEventListener('dragstart', (e) => {
      const li = e.target.closest('[data-id]');
      if (!li) return;
      e.dataTransfer.effectAllowed = 'move';
      // Store the task id so drop can identify the dragged item
      e.dataTransfer.setData('text/plain', li.getAttribute('data-id'));
      // Give the element a visual "being-dragged" style
      li.classList.add('dragging');
    });

    // dragover — allow drop by preventing browser's default (reject) behaviour;
    // also highlight the item the pointer is currently hovering over.
    this._listEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const li = e.target.closest('[data-id]');
      if (!li) return;
      // Remove indicator from any previously highlighted sibling
      this._listEl.querySelectorAll('.drag-over').forEach((el) => {
        if (el !== li) el.classList.remove('drag-over');
      });
      li.classList.add('drag-over');
    });

    // dragleave — clean up the hover indicator when the pointer leaves an item
    this._listEl.addEventListener('dragleave', (e) => {
      const li = e.target.closest('[data-id]');
      if (li) li.classList.remove('drag-over');
    });

    // dragend — fires on the source element after the drag ends (drop or cancel);
    // ensures the dragging class is always removed even if drop fires elsewhere.
    this._listEl.addEventListener('dragend', (e) => {
      const li = e.target.closest('[data-id]');
      if (li) li.classList.remove('dragging');
      // Safety: clear any stale hover indicators
      this._listEl.querySelectorAll('.drag-over').forEach((el) => {
        el.classList.remove('drag-over');
      });
    });

    // drop — reorder this.tasks[] to match the new DOM position, persist, re-render.
    // Req 5.1, 5.2
    this._listEl.addEventListener('drop', (e) => {
      e.preventDefault();

      const draggedId = e.dataTransfer.getData('text/plain');
      if (!draggedId) return;

      const targetLi = e.target.closest('[data-id]');
      if (!targetLi) return;

      const targetId = targetLi.getAttribute('data-id');
      if (draggedId === targetId) return; // dropped on itself — nothing to do

      // Determine whether to insert before or after the target based on
      // where within the target's bounding box the pointer was released.
      const rect = targetLi.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const insertBefore = e.clientY < midY;

      // Reorder this.tasks[] to match the intended DOM order.
      const draggedIndex = this.tasks.findIndex((t) => t.id === draggedId);
      const targetIndex  = this.tasks.findIndex((t) => t.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return;

      // Extract the dragged task
      const [draggedTask] = this.tasks.splice(draggedIndex, 1);

      // Find the updated target index after the splice
      const newTargetIndex = this.tasks.findIndex((t) => t.id === targetId);

      // Insert at the correct position relative to the target
      const insertAt = insertBefore ? newTargetIndex : newTargetIndex + 1;
      this.tasks.splice(insertAt, 0, draggedTask);

      // Persist the new order (Req 5.2) and re-render
      Storage.set('pd_tasks', this.tasks);
      this._renderList();
    });
  },

  // -----------------------------------------------------------------
  // init(containerEl)
  // Restores tasks from Storage, caches DOM references, wires the
  // add-task form and sort buttons, and does an initial render.
  // Req 4.11, 5.3, 5.5
  // -----------------------------------------------------------------
  init(containerEl) {
    // Restore persisted tasks (Req 4.11)
    this.tasks = Storage.get('pd_tasks', []);

    // Cache DOM references
    this._listEl = containerEl.querySelector('#todo-items');
    this._form   = containerEl.querySelector('#todo-add-form');
    this._input  = containerEl.querySelector('#todo-input');

    // Wire the add-task form (Req 4.1, 4.2, 4.3)
    if (this._form && this._input) {
      this._form.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = this._input.value;
        const countBefore = this.tasks.length;
        this._addTask(title);
        // Clear the input only if a task was actually added
        if (this.tasks.length > countBefore) {
          this._input.value = '';
        }
      });
    }

    // Wire sort buttons (Req 5.3, 5.5)
    const sortAlphaBtn  = containerEl.querySelector('#todo-sort-alpha');
    const sortStatusBtn = containerEl.querySelector('#todo-sort-status');

    if (sortAlphaBtn) {
      sortAlphaBtn.addEventListener('click', () => this._sortAlpha());
    }
    if (sortStatusBtn) {
      sortStatusBtn.addEventListener('click', () => this._sortByStatus());
    }

    // Initial render and drag-and-drop setup
    this._renderList();
    this._initDragAndDrop();
  },
};

// =============================================================
// QuickLinks Module
// Link CRUD, URL validation, open-in-new-tab, and rendering.
// Links are stored in localStorage under the key pd_links.
// Req 6.1–6.10
// =============================================================
const QuickLinks = {
  // Internal state
  links: [],

  // DOM references — set during init()
  _containerEl:    null,
  _linksEl:        null,
  _form:           null,
  _labelInput:     null,
  _urlInput:       null,
  _validationMsg:  null,

  // -----------------------------------------------------------------
  // _validateUrl(url)
  // Uses the native URL constructor inside a try/catch to parse the
  // given string. Returns true only when parsing succeeds AND the
  // protocol is http: or https:. All other values return false.
  // Req 6.4, 6.5 — Design Property 11
  // -----------------------------------------------------------------
  _validateUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (e) {
      return false;
    }
  },

  // -----------------------------------------------------------------
  // _addLink(label, url)
  // Validates that label is non-empty and url passes _validateUrl.
  // On failure, shows an inline validation message and returns early.
  // On success: truncates label to 30 chars, generates an ID,
  // pushes to this.links[], persists, clears the form, and re-renders.
  // Req 6.3, 6.4, 6.5, 6.9, 6.10 — Design Property 10, 11
  // -----------------------------------------------------------------
  _addLink(label, url) {
    const trimmedLabel = (typeof label === 'string') ? label.trim() : '';
    const trimmedUrl   = (typeof url   === 'string') ? url.trim()   : '';

    // Validation (Req 6.5)
    if (trimmedLabel === '' && !this._validateUrl(trimmedUrl)) {
      this._showValidation('Please enter a label and a valid http/https URL.');
      return;
    }
    if (trimmedLabel === '') {
      this._showValidation('Label cannot be empty.');
      return;
    }
    if (!this._validateUrl(trimmedUrl)) {
      this._showValidation('URL must be a valid http or https address.');
      return;
    }

    // Clear any previous validation message
    this._showValidation('');

    // Truncate label at 30 characters (Req 6.9, 6.10)
    const truncatedLabel = trimmedLabel.slice(0, 30);

    // Generate a unique ID — prefer crypto.randomUUID(), fall back to Date.now()
    const id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : Date.now().toString();

    /** @type {{ id: string, label: string, url: string }} */
    const link = { id, label: truncatedLabel, url: trimmedUrl };

    this.links.push(link);
    Storage.set('pd_links', this.links);
    this._renderLinks();
  },

  // -----------------------------------------------------------------
  // _deleteLink(id)
  // Removes the link with the given id from this.links[], persists,
  // and re-renders the links container.
  // Req 6.6, 6.7
  // -----------------------------------------------------------------
  _deleteLink(id) {
    this.links = this.links.filter((l) => l.id !== id);
    Storage.set('pd_links', this.links);
    this._renderLinks();
  },

  // -----------------------------------------------------------------
  // _openLink(url)
  // Opens the given URL in a new browser tab with appropriate security
  // attributes to prevent the opened page from accessing window.opener.
  // Req 6.2
  // -----------------------------------------------------------------
  _openLink(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  },

  // -----------------------------------------------------------------
  // _showValidation(message)
  // Writes message to the validation paragraph element. An empty
  // string effectively hides the message (zero-height, invisible).
  // Req 6.5
  // -----------------------------------------------------------------
  _showValidation(message) {
    if (this._validationMsg) {
      this._validationMsg.textContent = message;
    }
  },

  // -----------------------------------------------------------------
  // _renderLinks()
  // Clears and rebuilds the #links-container from this.links[].
  // Each link renders as a card with a clickable label button and a
  // delete button. All controls have accessible aria-labels.
  // Req 6.1, 6.2, 6.6, 6.8
  // -----------------------------------------------------------------
  _renderLinks() {
    if (!this._linksEl) return;

    // Clear existing content
    this._linksEl.innerHTML = '';

    if (this.links.length === 0) {
      const placeholder = document.createElement('p');
      placeholder.className = 'links-empty-placeholder';
      placeholder.textContent = 'No links yet. Add one above!';
      this._linksEl.appendChild(placeholder);
      return;
    }

    this.links.forEach((link) => {
      // Card container
      const card = document.createElement('div');
      card.className = 'link-card';
      card.setAttribute('data-id', link.id);

      // Link button — opens the URL in a new tab (Req 6.1, 6.2)
      const linkBtn = document.createElement('button');
      linkBtn.type = 'button';
      linkBtn.className = 'link-card__open-btn';
      linkBtn.textContent = link.label;
      linkBtn.setAttribute('aria-label', `Open ${link.label}: ${link.url}`);
      linkBtn.addEventListener('click', () => {
        this._openLink(link.url);
      });

      // Delete button (Req 6.6, 6.7)
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'link-card__delete-btn';
      deleteBtn.textContent = '×';
      deleteBtn.setAttribute('aria-label', `Delete link ${link.label}`);
      deleteBtn.addEventListener('click', () => {
        this._deleteLink(link.id);
      });

      card.appendChild(linkBtn);
      card.appendChild(deleteBtn);
      this._linksEl.appendChild(card);
    });
  },

  // -----------------------------------------------------------------
  // init(containerEl)
  // Restores links from Storage, caches DOM references, wires the
  // add-link form, and calls _renderLinks() for the initial paint.
  // Req 6.8
  // -----------------------------------------------------------------
  init(containerEl) {
    this._containerEl   = containerEl;
    this._linksEl       = containerEl.querySelector('#links-container');
    this._form          = containerEl.querySelector('#links-add-form');
    this._labelInput    = containerEl.querySelector('#links-label-input');
    this._urlInput      = containerEl.querySelector('#links-url-input');
    this._validationMsg = containerEl.querySelector('#links-validation-msg');

    // Restore persisted links (Req 6.8)
    this.links = Storage.get('pd_links', []);

    // Wire the add-link form (Req 6.3, 6.4, 6.5)
    if (this._form && this._labelInput && this._urlInput) {
      this._form.addEventListener('submit', (e) => {
        e.preventDefault();
        const label = this._labelInput.value;
        const url   = this._urlInput.value;
        const countBefore = this.links.length;
        this._addLink(label, url);
        // Clear the form inputs only if a link was actually added
        if (this.links.length > countBefore) {
          this._labelInput.value = '';
          this._urlInput.value   = '';
        }
      });
    }

    // Initial render
    this._renderLinks();
  },
};

// =============================================================
// App — Bootstrap
// Initialises Storage, then each widget module in order.
// The 1-second clock interval fires both GreetingWidget.tick()
// and FocusTimer._tick() so time-based widgets stay in sync.
// =============================================================
const App = {
  init() {
    // 1. Initialise storage first (enables all subsequent reads/writes)
    Storage.init();

    // 2. Apply saved theme immediately to prevent flash of unstyled content
    //    (ThemeToggle.init reads Storage, so Storage must be ready first)
    const themeBtn = document.getElementById('theme-toggle');
    ThemeToggle.init(themeBtn);

    // 3. Initialise each widget, scoped to its container element
    const greetingEl  = document.getElementById('greeting');
    const timerEl     = document.getElementById('focus-timer');
    const todoEl      = document.getElementById('todo-list');
    const quickLinksEl = document.getElementById('quick-links');

    if (greetingEl)   GreetingWidget.init(greetingEl);
    if (timerEl)      FocusTimer.init(timerEl);
    if (todoEl)       TodoList.init(todoEl);
    if (quickLinksEl) QuickLinks.init(quickLinksEl);

    // 4. Start the 1-second interval — drives the clock and the timer countdown
    setInterval(() => {
      GreetingWidget.tick();
      FocusTimer._tick();
    }, 1000);
  },
};

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
