# BrainBox - AI Chat Organizer

**BrainBox** is a powerful browser extension that helps you organize, save, and manage your AI conversations from ChatGPT, Claude, and Gemini into a single, unified dashboard.

## 🚀 Features

*   **Multi-Platform Support**: Works seamlessly with ChatGPT, Claude.ai, and Google Gemini.
*   **One-Click Save**: Hover over any conversation in your history to reveal a "Save" button.
*   **Smart Organization**: Organize chats into folders directly from the extension.
*   **Privacy First**: Your data is stored securely on your own BrainBox Dashboard.
*   **Safe Integration**: Uses non-intrusive DOM methods and official APIs where possible. Includes "Human-like" rate limiting to protect your accounts.

## 📦 Installation

Since this extension is in **Developer Preview**, you need to install it manually:

1.  **Download/Clone** this repository to your computer.
2.  Open Google Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** (toggle switch in the top right corner).
4.  Click **Load unpacked**.
5.  Select the `extension` folder inside the project directory.
6.  The **BrainBox** icon should appear in your toolbar.

## 🛠️ Usage

1.  **Login**: Ensure you are logged into your [BrainBox Dashboard](https://brainbox-alpha.vercel.app).
2.  **Navigate**: Go to your favorite AI chat platform (e.g., [chatgpt.com](https://chatgpt.com)).
3.  **Hover**: Move your mouse over any conversation in the sidebar history.
4.  **Save**: Click the **Save** (disk) icon to archive the chat.
5.  **Organize**: Click the **Folder** icon to choose a specific folder for the chat.

## 🔒 Permissions & Privacy

We take your privacy seriously. This extension requires the following permissions:

*   `storage`: To securely store your authentication tokens locally.
*   `webRequest`: To intercept authentication tokens for API access (never logs passwords).
*   `host_permissions`: To interact with ChatGPT, Claude, Gemini, and your Dashboard.

**Note**: No data is sent to third-party servers. All conversation data is transmitted directly from your browser to your BrainBox Dashboard instance.

## Configuration

To switch between production and development environments, edit `extension/lib/config.js` and `extension/lib/config-global.js`.
- For production: `https://brainbox-alpha.vercel.app`
- For development: `http://localhost:3000`

> Note: If you change the URL, you must also update the `host_permissions` in `manifest.json`.
