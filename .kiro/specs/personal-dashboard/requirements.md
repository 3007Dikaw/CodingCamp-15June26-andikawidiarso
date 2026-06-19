# Requirements Document

## Introduction

A personal dashboard is a single-page web application that runs entirely in the browser using HTML, CSS, and Vanilla JavaScript with no backend or framework dependencies. It provides a focused productivity workspace combining a time-aware greeting, a configurable focus timer, a sortable to-do list, and a quick-links panel. All user data persists across sessions using the Browser Local Storage API. The application supports light and dark themes and is compatible with Chrome, Firefox, Edge, and Safari as both a standalone web app and a browser extension.

---

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **User**: The person using the Dashboard in a browser.
- **LocalStorage**: The Browser Local Storage API used for client-side data persistence.
- **Greeting_Widget**: The UI component that displays the current time, date, and a personalized greeting message.
- **Focus_Timer**: The UI component that provides a configurable countdown timer for focused work sessions.
- **Todo_List**: The UI component that manages a collection of tasks the User can add, edit, sort, complete, and delete.
- **Quick_Links**: The UI component that displays a set of user-defined shortcut buttons to external URLs.
- **Theme_Toggle**: The UI control that switches the Dashboard between light mode and dark mode.
- **Task**: A single to-do item stored in the Todo_List, with a title and a completion status.
- **Link**: A user-defined record stored in Quick_Links containing a label and a URL.
- **Session**: A single continuous period of user interaction with the Dashboard from page load to page close or refresh.

---

## Requirements

### Requirement 1: Time and Date Greeting

**User Story:** As a User, I want to see the current time, date, and a contextual greeting when I open the Dashboard, so that I am immediately oriented and welcomed.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current local time in HH:MM format, updated every second.
2. THE Greeting_Widget SHALL display the current local date in a human-readable format (e.g., "Monday, June 16, 2025").
3. WHEN the local hour is between 05:00 and 11:59, THE Greeting_Widget SHALL display the greeting "Good Morning".
4. WHEN the local hour is between 12:00 and 17:59, THE Greeting_Widget SHALL display the greeting "Good Afternoon".
5. WHEN the local hour is between 18:00 and 21:59, THE Greeting_Widget SHALL display the greeting "Good Evening".
6. WHEN the local hour is between 22:00 and 04:59, THE Greeting_Widget SHALL display the greeting "Good Night".
7. WHEN a custom name has been saved by the User, THE Greeting_Widget SHALL append the saved name to the greeting (e.g., "Good Morning, Alex").

---

### Requirement 2: Custom Name in Greeting

**User Story:** As a User, I want to set a custom name that appears in the greeting, so that the Dashboard feels personalized.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL provide an input field or inline-edit control for the User to enter a custom name.
2. WHEN the User submits a non-empty name, THE Dashboard SHALL save the name to LocalStorage under a dedicated key.
3. WHEN the Dashboard loads and a saved name exists in LocalStorage, THE Greeting_Widget SHALL display the saved name in the greeting without requiring re-entry.
4. WHEN the User clears the name field and submits, THE Dashboard SHALL remove the name from LocalStorage and THE Greeting_Widget SHALL display the greeting without a name suffix.
5. THE Dashboard SHALL accept names up to 50 characters in length.
6. IF the User submits a name exceeding 50 characters, THEN THE Dashboard SHALL truncate the stored name to 50 characters.

---

### Requirement 3: Focus Timer

**User Story:** As a User, I want a configurable countdown timer, so that I can manage focused work sessions.

#### Acceptance Criteria

1. THE Focus_Timer SHALL default to a duration of 25 minutes on first load.
2. WHEN the Dashboard loads and a saved timer duration exists in LocalStorage, THE Focus_Timer SHALL restore the saved duration as the default value.
3. THE Focus_Timer SHALL display the remaining time in MM:SS format.
4. WHEN the User activates the Start control, THE Focus_Timer SHALL begin counting down one second per real second.
5. WHEN the User activates the Stop control while the timer is running, THE Focus_Timer SHALL pause the countdown and retain the remaining time.
6. WHEN the User activates the Reset control, THE Focus_Timer SHALL restore the remaining time to the current configured duration and stop counting.
7. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically and THE Dashboard SHALL notify the User with a browser notification or an audible alert.
8. THE Focus_Timer SHALL provide an input or control for the User to set a custom duration between 1 minute and 99 minutes.
9. WHEN the User sets a valid custom duration, THE Dashboard SHALL save the new duration to LocalStorage and THE Focus_Timer SHALL use that duration for subsequent sessions.
10. IF the User sets a duration outside the range of 1 to 99 minutes, THEN THE Dashboard SHALL reject the value and retain the previous valid duration.
11. WHILE the Focus_Timer is running, THE Focus_Timer SHALL disable the duration input to prevent mid-session changes.

---

### Requirement 4: To-Do List

**User Story:** As a User, I want to manage a list of tasks, so that I can track what I need to accomplish.

#### Acceptance Criteria

1. THE Todo_List SHALL provide an input field for the User to type a new task title.
2. WHEN the User submits a non-empty task title, THE Todo_List SHALL add the new Task to the list and save the updated list to LocalStorage.
3. IF the User attempts to submit an empty task title, THEN THE Todo_List SHALL reject the submission and not add a Task.
4. THE Todo_List SHALL display all saved Tasks, each showing the task title and a completion indicator.
5. WHEN the User activates the completion control on a Task, THE Todo_List SHALL toggle the Task's completion status and save the updated state to LocalStorage.
6. THE Todo_List SHALL provide an edit control for each Task.
7. WHEN the User activates the edit control and submits a non-empty updated title, THE Todo_List SHALL update the Task's title in the list and save the change to LocalStorage.
8. IF the User activates the edit control and submits an empty title, THEN THE Todo_List SHALL reject the update and retain the original task title.
9. THE Todo_List SHALL provide a delete control for each Task.
10. WHEN the User activates the delete control on a Task, THE Todo_List SHALL remove the Task from the list and save the updated list to LocalStorage.
11. WHEN the Dashboard loads and saved Tasks exist in LocalStorage, THE Todo_List SHALL restore and display all saved Tasks.

---

### Requirement 5: Task Sorting

**User Story:** As a User, I want to sort my tasks, so that I can organize them in the order most useful to me.

#### Acceptance Criteria

1. THE Todo_List SHALL support sorting Tasks by drag-and-drop reordering.
2. WHEN the User reorders Tasks via drag-and-drop, THE Todo_List SHALL persist the new Task order to LocalStorage.
3. THE Todo_List SHALL provide a sort control that sorts Tasks alphabetically by title in ascending order (A–Z).
4. WHEN the User activates the alphabetical sort control, THE Todo_List SHALL re-render Tasks in ascending alphabetical order and save the new order to LocalStorage.
5. THE Todo_List SHALL provide a sort control that groups incomplete Tasks before completed Tasks.
6. WHEN the User activates the status sort control, THE Todo_List SHALL re-render incomplete Tasks first, followed by completed Tasks, and save the new order to LocalStorage.

---

### Requirement 6: Quick Links

**User Story:** As a User, I want to save and access shortcut buttons to my favorite websites, so that I can navigate quickly from the Dashboard.

#### Acceptance Criteria

1. THE Quick_Links SHALL display all saved Links as clickable buttons or cards.
2. WHEN the User activates a Link button, THE Dashboard SHALL open the associated URL in a new browser tab.
3. THE Quick_Links SHALL provide a form for the User to add a new Link by entering a label and a URL.
4. WHEN the User submits a new Link with a non-empty label and a valid URL, THE Quick_Links SHALL add the Link to the panel and save it to LocalStorage.
5. IF the User submits a Link with an empty label or an invalid URL, THEN THE Quick_Links SHALL reject the submission and display an inline validation message.
6. THE Quick_Links SHALL provide a delete control for each Link.
7. WHEN the User activates the delete control on a Link, THE Quick_Links SHALL remove the Link from the panel and save the updated list to LocalStorage.
8. WHEN the Dashboard loads and saved Links exist in LocalStorage, THE Quick_Links SHALL restore and display all saved Links.
9. THE Dashboard SHALL accept Link labels up to 30 characters in length.
10. IF the User submits a Link label exceeding 30 characters, THEN THE Quick_Links SHALL truncate the stored label to 30 characters.

---

### Requirement 7: Dark Mode and Light Mode Toggle

**User Story:** As a User, I want to switch between dark and light themes, so that I can use the Dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Theme_Toggle SHALL provide a control that switches the Dashboard between light mode and dark mode.
2. WHEN the User activates the Theme_Toggle, THE Dashboard SHALL apply the selected theme to all UI components immediately without a page reload.
3. WHEN the User activates the Theme_Toggle, THE Dashboard SHALL save the selected theme preference to LocalStorage.
4. WHEN the Dashboard loads and a saved theme preference exists in LocalStorage, THE Dashboard SHALL apply the saved theme before rendering visible content to avoid a flash of unstyled content.
5. WHEN the Dashboard loads and no saved theme preference exists, THE Dashboard SHALL apply light mode as the default theme.

---

### Requirement 8: Data Persistence and Storage

**User Story:** As a User, I want my data to be saved automatically so that my tasks, links, timer setting, and name are available every time I open the Dashboard.

#### Acceptance Criteria

1. THE Dashboard SHALL use LocalStorage as the sole data store; no data SHALL be transmitted to any external server.
2. WHEN the User creates, updates, deletes, or reorders any data item, THE Dashboard SHALL write the change to LocalStorage before the operation is considered complete.
3. WHEN the Dashboard loads, THE Dashboard SHALL read all persisted data from LocalStorage and restore the UI state within 500 milliseconds of page load.
4. IF LocalStorage is unavailable or access is denied by the browser, THEN THE Dashboard SHALL display a warning message indicating that data cannot be saved and will not persist.

---

### Requirement 9: Browser Compatibility and Performance

**User Story:** As a User, I want the Dashboard to work reliably across major browsers and load quickly, so that it is always accessible and responsive.

#### Acceptance Criteria

1. THE Dashboard SHALL render and function correctly in the current stable versions of Chrome, Firefox, Edge, and Safari.
2. THE Dashboard SHALL complete initial page load and render all UI components within 2 seconds on a standard broadband connection.
3. THE Dashboard SHALL respond to all User interactions within 100 milliseconds.
4. THE Dashboard SHALL be implemented using only HTML, CSS, and Vanilla JavaScript with no external frameworks, libraries, or runtime dependencies.
5. THE Dashboard SHALL consist of one HTML file, one CSS file located in a `css/` directory, and one JavaScript file located in a `js/` directory.

---

### Requirement 10: Visual Design and Layout

**User Story:** As a User, I want a clean, readable, and visually organized interface, so that the Dashboard is pleasant and easy to use at a glance.

#### Acceptance Criteria

1. THE Dashboard SHALL present all four widgets (Greeting_Widget, Focus_Timer, Todo_List, Quick_Links) in a single scrollable page without requiring navigation between separate views.
2. THE Dashboard SHALL use a consistent typographic scale with a minimum body font size of 14px to ensure readability.
3. THE Dashboard SHALL apply sufficient color contrast between text and background to meet WCAG 2.1 AA contrast ratio requirements (minimum 4.5:1 for normal text).
4. THE Dashboard SHALL use a responsive layout that adapts to viewport widths from 320px to 1920px without horizontal scrolling.
5. THE Dashboard SHALL provide clear visual separation between each widget using spacing, borders, or card-style containers.
