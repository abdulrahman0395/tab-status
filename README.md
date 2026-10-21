# Tab Status

A lightweight Chromium extension that adds a short status label to the front of a tab's title — "Waiting on agents", "FP check", "Ready for review" — so you can see what each tab is waiting on at a glance, without losing the page's original title.

Works in Brave, Chrome, Edge, and other Chromium-based browsers.

## Features

- **Per-tab status labels.** The label is shown before the page's own title, e.g. `Waiting on agents | Cap enforcement actions per namespace`.
- **Survives restarts.** Statuses are saved per page and restored when the browser reopens or the page is opened again.
- **Resilient to title changes.** If a single-page app rewrites its title, the label is reapplied automatically.
- **Saved statuses.** Recently used statuses appear as one-click chips. Pin the ones you use often; unpinned entries expire on their own.
- **Update notifications.** The extension checks this repository for new versions and shows a **↑** badge when one is available.
- **Private by design.** All data is stored locally in your browser. Nothing is collected or sent anywhere.

## Installation

Installing from a Git clone lets you update with a single click later.

1. Install [Git for Windows](https://git-scm.com/download/win) if you don't have it.
2. Clone the repository into a permanent folder:
   ```
   git clone https://github.com/abdulrahman0395/tab-status.git
   ```
3. Open `brave://extensions` (or `chrome://extensions`) and enable **Developer mode**.
4. Click **Load unpacked** and select the `tab-status` folder.
5. Pin the extension from the toolbar's extensions menu for quick access.

> **Without Git:** on this page, choose **Code → Download ZIP**, extract it to a permanent folder, and continue from step 3. Updates will then need to be applied manually.

## Updating

When a new version is available, a **↑** badge appears on the extension icon and the popup shows an update banner.

1. Run `update.bat` in the extension folder.
2. Click the update button in the popup's banner, or reload the extension from `brave://extensions`.

Your statuses and saved list are preserved across updates.

## Usage

| Action | How |
|---|---|
| Open the popup | Click the extension icon, or press **Alt+Shift+S** |
| Set a status on the current tab | Type it and press **Enter** |
| Edit the current status | Open the popup — the current status is preselected for editing |
| Save a status without applying it | **Ctrl+Enter**, or the **＋** button |
| Apply a saved status | Click its chip |
| Pin a saved status | Click 📌 on its chip |
| Clear the tab's status | Empty the field and press **Enter**, or use the clear button |

### Retention

- **Unpinned statuses:** the 8 most recent are kept, and any unused for 7 days are removed.
- **Pinned statuses:** never removed automatically.
- **Statuses on open pages:** never removed while in use.
- **Page statuses:** forgotten after 30 days without changes.

Query strings and fragments are ignored when matching pages, so `/challenges/abc?run=1` and `/challenges/abc?run=2` share the same status.

## Permissions

| Permission | Purpose |
|---|---|
| `storage` | Saves statuses and preferences locally |
| `activeTab`, `scripting` | Applies a status to the tab you're working in |
| Content script on all sites | Restores a page's status when it loads and keeps it in place if the page changes its title |

The only network request the extension makes is reading `manifest.json` from this repository to check for updates.

## Limitations

- Browser-internal pages (`brave://`, `chrome://`) and extension stores do not allow labels.
- Statuses are stored per extension installation. Loading the extension from a different folder starts with an empty list.
