# Tab Status

A lightweight Chromium extension that adds a short status label to the front of a tab's title — "Waiting for reply", "Build running", "Read later" — so you can tell what each tab is for at a glance, without losing the page's original title.

Useful whenever you keep many tabs open at once: long-running jobs, pending replies, research in progress, or anything you need to come back to.

See [Browser support](#browser-support) for where it runs.

## Features

- **Per-tab status labels.** The label is shown before the page's own title, e.g. `Waiting for reply | Project kickoff – Inbox`.
- **Survives restarts.** Statuses are saved per page and restored when the browser reopens or the page is opened again.
- **Resilient to title changes.** If a single-page app rewrites its title, the label is reapplied automatically.
- **Saved statuses.** Recently used statuses appear as one-click chips. Pin the ones you use often; unpinned entries expire on their own.
- **Automatic statuses (optional).** Scripts running on a page, such as userscripts, can set the tab's status for you when something starts or finishes. Off by default.
- **Update notifications.** The extension checks this repository for new versions and shows a **↑** badge when one is available.
- **Private by design.** All data is stored locally on your device. Nothing is collected or sent anywhere.

## Installation

The extension is installed from source. Installing from a Git clone is recommended, because updates then take a single command.

### 1. Get the files

1. Install [Git](https://git-scm.com/downloads) if you don't already have it.
2. Clone the repository into a folder you will keep (the browser loads the extension from this folder, so don't delete or move it):
   ```
   git clone https://github.com/abdulrahman0395/tab-status.git
   ```

> **Without Git:** choose **Code → Download ZIP** on this page and extract it to a permanent folder. Updates will then need to be downloaded manually.

### 2. Load it into your browser

1. Open your browser's extensions page (see the table below).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select the `tab-status` folder.
4. Optionally, pin the extension to the toolbar from the extensions menu.

| Browser | Extensions page |
|---|---|
| Google Chrome | `chrome://extensions` |
| Brave | `brave://extensions` |
| Opera / Opera GX | `opera://extensions` |
| Microsoft Edge | `edge://extensions` |

The steps are the same in all of them; only the address differs. Any other browser built on Chromium works the same way.

## Browser support

| Browser | Status |
|---|---|
| Chrome, Brave, Opera, Edge, and other Chromium-based browsers | ✅ Supported |
| Firefox | ❌ Not yet supported |
| Safari | ❌ Not yet supported |

**Firefox** loads unpacked extensions only temporarily (they are removed when the browser restarts) and does not run this extension's background script in its current form. Permanent installation also requires the extension to be signed by Mozilla.

**Safari** requires the extension to be converted into a macOS app with Xcode and signed before it can be installed.

Support for both is planned. Contributions are welcome.

## Updating

When a new version is available, a **↑** badge appears on the extension icon and the popup shows an update banner.

1. Pull the latest version into the extension folder:
   - **Windows:** double-click `update.bat`.
   - **macOS / Linux:** run `git pull` in the folder.
2. Click the update button in the popup's banner, or press the reload button on the extension in your browser's extensions page.

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

### Automatic statuses

Turn on **automatic statuses** at the bottom of the popup to let scripts on a page (for example, a userscript) set that tab's status. It is off by default, and while it is off these requests are ignored.

A script sets the status by dispatching a DOM event whose `detail` is the label text:

```js
document.dispatchEvent(new CustomEvent("tab-status:set", { detail: "Build running" }));
```

- `detail` must be a string (at most 40 characters are used). Objects do not reach the extension.
- Sending the same label repeatedly is harmless; only changes are applied.
- An empty string clears the status, but only if the current status was set by a script. A status you typed yourself is left alone.
- A new label from a script replaces whatever status the tab had, including one you typed.

### Retention

- **Unpinned statuses:** the 8 most recent are kept, and any unused for 7 days are removed.
- **Pinned statuses:** never removed automatically.
- **Statuses on open pages:** never removed while in use.
- **Page statuses:** forgotten after 30 days without changes.

Query strings and fragments are ignored when matching pages, so `example.com/orders/42?tab=details` and `example.com/orders/42?tab=history` share the same status.

## Permissions

| Permission | Purpose |
|---|---|
| `storage` | Saves statuses and preferences locally |
| `activeTab`, `scripting` | Applies a status to the tab you're working in |
| Content script on all sites | Restores a page's status when it loads and keeps it in place if the page changes its title |

The only network request the extension makes is reading `manifest.json` from this repository to check for updates.

## Limitations

- Browser-internal pages (settings, the extensions page, new-tab pages) and extension stores do not allow labels.
- Statuses are stored per extension installation. Loading the extension from a different folder starts with an empty list.
